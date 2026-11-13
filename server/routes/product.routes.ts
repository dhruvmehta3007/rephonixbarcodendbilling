import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';
import { generateUniqueBarcode } from '../utils/barcode';

const router = Router();

// Validation schema for creating/updating products
const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  customValue: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  currentStock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
  minStockThreshold: z.number().int().min(0).default(5),
  unit: z.string().default('pcs'),
});

// GET /api/products
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, categoryId, stockStatus, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '50' } = req.query;

    const where: any = { isArchived: false };

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { barcode: { contains: q } },
      ];
    }

    if (categoryId && typeof categoryId === 'string' && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: {
        [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
      },
    });

    // In-memory filter for stockStatus since SQLite doesn't compare fields directly
    if (stockStatus === 'low') {
      products = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockThreshold);
    } else if (stockStatus === 'out') {
      products = products.filter((p) => p.currentStock <= 0);
    } else if (stockStatus === 'in_stock') {
      products = products.filter((p) => p.currentStock > p.minStockThreshold);
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const totalCount = products.length;
    const paginated = products.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      data: paginated,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        inventoryMovements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { fullName: true } } },
        },
      },
    });

    if (!product || product.isArchived) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const data = parse.data;

    // Auto-generate unique barcode if empty (Code128 format using guaranteed unique identifier)
    let barcode = data.barcode?.trim();
    if (!barcode) {
      barcode = await generateUniqueBarcode('CPB', 'product');
    } else {
      // Check duplicate barcode
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode) {
        return res.status(400).json({ error: `Product with Barcode "${barcode}" already exists.` });
      }
    }

    // Create product and opening stock movement atomically
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...data,
          categoryId: data.categoryId && data.categoryId.trim() !== '' ? data.categoryId : null,
          supplierId: data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : null,
          barcode,
        },
      });

      if (data.currentStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: created.id,
            type: 'OPENING',
            quantityChange: data.currentStock,
            stockBefore: 0,
            stockAfter: data.currentStock,
            reason: 'Opening stock on product creation',
            userId: req.user?.id,
          },
        });
      }

      return created;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PRODUCT_CREATE',
      entity: 'Product',
      entityId: product.id,
      details: `Created product "${product.name}" (Barcode: ${product.barcode}, Stock: ${product.currentStock})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const data = parse.data;
    const id = req.params.id as string;

    // Check barcode conflict with another product
    if (data.barcode) {
      const conflict = await prisma.product.findFirst({
        where: { barcode: data.barcode, NOT: { id } },
      });
      if (conflict) {
        return res.status(400).json({ error: `Barcode "${data.barcode}" is already used by another product.` });
      }
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If currentStock changed manually via edit form, record an adjustment movement
    const stockDiff = data.currentStock - existing.currentStock;

    const updated = await prisma.$transaction(async (tx) => {
      const resProduct = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          barcode: data.barcode || existing.barcode,
          description: data.description,
          categoryId: data.categoryId && data.categoryId.trim() !== '' ? data.categoryId : null,
          supplierId: data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : null,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          customValue: data.customValue !== undefined ? data.customValue : existing.customValue,
          taxRate: data.taxRate,
          currentStock: data.currentStock,
          minStockThreshold: data.minStockThreshold,
          unit: data.unit,
        },
      });

      if (stockDiff !== 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: id,
            type: 'ADJUSTMENT',
            quantityChange: stockDiff,
            stockBefore: existing.currentStock,
            stockAfter: data.currentStock,
            reason: 'Manual adjustment via product edit form',
            userId: req.user?.id,
          },
        });
      }

      return resProduct;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PRODUCT_UPDATE',
      entity: 'Product',
      entityId: id,
      details: `Updated product "${updated.name}"`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

// DELETE /api/products/:id (Archive)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete / archive product so historical invoices and records remain intact
    await prisma.product.update({
      where: { id },
      data: { isArchived: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PRODUCT_ARCHIVE',
      entity: 'Product',
      entityId: id,
      details: `Archived product "${existing.name}" (Barcode: ${existing.barcode})`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Product archived successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to archive product' });
  }
});

// POST /api/products/import-csv
router.post('/import-csv', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for CSV import' });
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const name = String(item.name || item.Name || item.productName || '').trim();
      let barcode = String(item.barcode || item.Barcode || '').trim();

      if (!name) {
        errors.push(`Row ${i + 1}: Name is required`);
        continue;
      }

      if (!barcode) {
        barcode = await generateUniqueBarcode('CPB', 'product');
      } else {
        const existing = await prisma.product.findUnique({ where: { barcode } });
        if (existing) {
          errors.push(`Row ${i + 1}: Barcode "${barcode}" already exists`);
          continue;
        }
      }

      const purchasePrice = parseFloat(item.purchasePrice || item.cost || '0') || 0;
      const sellingPrice = parseFloat(item.sellingPrice || item.price || '0') || 0;
      const taxRate = parseFloat(item.taxRate || item.tax || '18') || 18;
      const stock = parseInt(item.stock || item.quantity || '0', 10) || 0;
      const minStock = parseInt(item.minStock || '5', 10) || 5;

      await prisma.$transaction(async (tx) => {
        const prod = await tx.product.create({
          data: {
            name,
            barcode,
            purchasePrice,
            sellingPrice,
            taxRate,
            currentStock: stock,
            minStockThreshold: minStock,
            unit: item.unit || 'pcs',
          },
        });

        if (stock > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: prod.id,
              type: 'OPENING',
              quantityChange: stock,
              stockBefore: 0,
              stockAfter: stock,
              reason: 'Bulk CSV Import Opening Stock',
              userId: req.user?.id,
            },
          });
        }
      });

      importedCount++;
    }

    return res.json({
      success: true,
      importedCount,
      errors,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'CSV import failed' });
  }
});

export default router;
