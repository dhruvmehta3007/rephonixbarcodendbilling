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
  sku: z.string().optional().nullable(),
  imeis: z.array(z.string()).optional(),
  units: z.array(z.object({
    imei: z.string(),
    customValue: z.string().optional().nullable(),
  })).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  customValue: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').default(0),
  currentStock: z.number().int().min(0).default(1),
  minStockThreshold: z.number().int().min(0).default(1),
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
        devices: {
          where: { status: 'IN_STOCK' },
          select: { id: true, imei1: true, barcode: true, customValue: true, status: true },
          orderBy: { createdAt: 'asc' },
        },
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

function generateSmartLabelCode(name: string): string {
  if (!name || !name.trim()) return '';
  const clean = name.trim();
  const storageMatch = clean.match(/(\d+\s*(?:GB|TB))/i);
  const storage = storageMatch ? storageMatch[1].replace(/\s+/g, '').toUpperCase() : '';
  const withoutStorage = clean.replace(/(\d+\s*(?:GB|TB))/i, '').trim();
  const words = withoutStorage.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0].slice(0, 6).toUpperCase() + (storage ? '-' + storage : '-01'));
  }
  const first = words[0].toUpperCase();
  let prefix = '';
  if (first === 'IPHONE' || first === 'APPLE') {
    prefix = 'A' + words.slice(1).filter((w) => /^[a-zA-Z0-9]+$/.test(w)).map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase())).join('').slice(0, 5);
  } else if (first === 'SAMSUNG') {
    prefix = 'SS' + words.slice(1).filter((w) => /^[a-zA-Z0-9]+$/.test(w)).map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase())).join('').slice(0, 5);
  } else if (first === 'VIVO') {
    prefix = 'VX' + words.slice(1).filter((w) => /^[a-zA-Z0-9]+$/.test(w)).map((w) => (w.length <= 4 ? w.toUpperCase() : w[0].toUpperCase())).join('').slice(0, 5);
  } else if (first === 'ONEPLUS') {
    prefix = 'OP' + words.slice(1).filter((w) => /^[a-zA-Z0-9]+$/.test(w)).map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase())).join('').slice(0, 5);
  } else {
    prefix = words.slice(0, 3).map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase())).join('').slice(0, 6);
  }
  const lastWord = words[words.length - 1];
  const color = words.length > 2 && !/^\d+$/.test(lastWord) ? lastWord.slice(0, 3).toUpperCase() : '';
  const parts = [prefix, storage, color].filter(Boolean);
  return parts.join('-');
}

// POST /api/products - Mobile Device Intake (1 IMEI = 1 Piece)
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const data = parse.data;

    // Collect all valid unique unit entries (IMEI + owner's secret cost code)
    let unitEntries: { imei: string; customValue: string | null }[] = [];
    if (data.units && data.units.length > 0) {
      unitEntries = data.units
        .map((u) => ({ imei: String(u.imei || '').trim(), customValue: u.customValue?.trim() || null }))
        .filter((u) => Boolean(u.imei));
    } else if (data.imeis && data.imeis.length > 0) {
      unitEntries = data.imeis
        .map((im) => ({ imei: String(im || '').trim(), customValue: data.customValue?.trim() || null }))
        .filter((u) => Boolean(u.imei));
    }

    const legacySku = ((req.body as any).sku || (data as any).sku)?.trim();
    if (unitEntries.length === 0 && data.barcode?.trim()) {
      unitEntries = [{ imei: data.barcode.trim(), customValue: data.customValue?.trim() || null }];
    } else if (unitEntries.length === 0 && legacySku) {
      unitEntries = [{ imei: legacySku, customValue: data.customValue?.trim() || null }];
    }

    if (unitEntries.length === 0) {
      return res.status(400).json({ error: 'Please enter or scan at least one 15-digit IMEI number.' });
    }

    const cleanImeis = unitEntries.map((u) => u.imei);

    // Check duplicate SKU if provided
    if (legacySku) {
      const existingSkuDev = await prisma.deviceUnit.findFirst({
        where: { OR: [{ barcode: legacySku }, { imei1: legacySku }, { serialNumber: legacySku }] },
      });
      const existingSkuProd = await prisma.product.findUnique({
        where: { barcode: legacySku },
      });
      if (existingSkuDev || existingSkuProd) {
        return res.status(400).json({ error: `Product with SKU "${legacySku}" already exists in store.` });
      }
    }

    // Check internal duplicates in this intake batch
    const uniqueBatch = new Set(cleanImeis);
    if (uniqueBatch.size !== cleanImeis.length) {
      return res.status(400).json({ error: 'Duplicate IMEI numbers detected in the input list.' });
    }

    // Check if any IMEI is already registered in store
    const existingDev = await prisma.deviceUnit.findFirst({
      where: {
        OR: cleanImeis.flatMap((im) => [{ barcode: im }, { imei1: im }]),
      },
      include: { product: true },
    });

    if (existingDev) {
      return res.status(400).json({
        error: `Device with IMEI "${existingDev.barcode || existingDev.imei1}" already exists in store.`,
      });
    }

    // Default category to 'Smartphones' if not provided
    let targetCatId = data.categoryId && data.categoryId.trim() !== '' ? data.categoryId : null;
    if (!targetCatId) {
      const smartCat = await prisma.category.findFirst({ where: { name: 'Smartphones' } });
      if (smartCat) targetCatId = smartCat.id;
    }

    const supplierId = data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : null;
    const totalNewUnits = Math.max(cleanImeis.length, data.currentStock || 0);

    // Check if a catalog product with this exact name already exists
    const existingProd = await prisma.product.findFirst({
      where: { name: data.name.trim(), isArchived: false },
    });

    const finalCustomValue = unitEntries.find((u) => u.customValue)?.customValue || data.customValue?.trim() || null;

    const result = await prisma.$transaction(async (tx) => {
      let targetProduct;

      if (existingProd) {
        // Increment stock and update pricing/custom value
        targetProduct = await tx.product.update({
          where: { id: existingProd.id },
          data: {
            currentStock: existingProd.currentStock + totalNewUnits,
            sellingPrice: data.sellingPrice,
            purchasePrice: data.purchasePrice,
            customValue: finalCustomValue || existingProd.customValue,
            taxRate: data.taxRate,
            categoryId: targetCatId || existingProd.categoryId,
            supplierId: supplierId || existingProd.supplierId,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: targetProduct.id,
            type: 'PURCHASE',
            quantityChange: totalNewUnits,
            stockBefore: existingProd.currentStock,
            stockAfter: existingProd.currentStock + totalNewUnits,
            reason: `Intake of ${totalNewUnits} mobile unit(s)`,
            userId: req.user?.id,
          },
        });
      } else {
        // Create new catalog product
        targetProduct = await tx.product.create({
          data: {
            name: data.name.trim(),
            barcode: cleanImeis[0],
            description: data.description,
            categoryId: targetCatId,
            supplierId: supplierId,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice,
            customValue: finalCustomValue,
            taxRate: data.taxRate,
            currentStock: totalNewUnits,
            minStockThreshold: data.minStockThreshold || 1,
            unit: 'pcs',
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: targetProduct.id,
            type: 'OPENING',
            quantityChange: totalNewUnits,
            stockBefore: 0,
            stockAfter: totalNewUnits,
            reason: `Opening stock: ${totalNewUnits} mobile unit(s)`,
            userId: req.user?.id,
          },
        });
      }

      // Create a unique DeviceUnit for each individual IMEI with its own customValue code
      const createdDevices = [];
      for (const u of unitEntries) {
        const dev = await tx.deviceUnit.create({
          data: {
            productId: targetProduct.id,
            barcode: u.imei,
            imei1: u.imei,
            serialNumber: legacySku || null,
            purchasePrice: data.purchasePrice || 0,
            customValue: u.customValue || finalCustomValue,
            condition: 'NEW',
            status: 'IN_STOCK',
            supplierId: supplierId,
            purchaseDate: new Date(),
            notes: 'Mobile intake via Product Catalog',
          },
        });
        createdDevices.push(dev);
      }

      return { product: targetProduct, devices: createdDevices };
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'PRODUCT_CREATE',
      entity: 'Product',
      entityId: result.product.id,
      details: `Intake of ${totalNewUnits} device(s) for "${result.product.name}" (IMEIs: ${cleanImeis.join(', ')})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ ...result.product, sku: legacySku || result.product.barcode });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to intake mobile device' });
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

      // Synchronize associated DeviceUnit
      const newBarcode = data.barcode || existing.barcode;
      const existingUnits = await tx.deviceUnit.findMany({ where: { productId: id } });
      if (existingUnits.length > 0) {
        for (const u of existingUnits) {
          await tx.deviceUnit.update({
            where: { id: u.id },
            data: {
              barcode: newBarcode,
              imei1: newBarcode,
              purchasePrice: data.purchasePrice,
              customValue: data.customValue !== undefined ? data.customValue : existing.customValue,
              supplierId: data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : null,
            },
          });
        }
      } else {
        await tx.deviceUnit.create({
          data: {
            productId: id,
            barcode: newBarcode,
            imei1: newBarcode,
            purchasePrice: data.purchasePrice || 0,
            customValue: data.customValue !== undefined ? data.customValue : existing.customValue,
            condition: 'NEW',
            status: 'IN_STOCK',
            supplierId: data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : null,
            purchaseDate: new Date(),
            notes: 'Auto-registered unit on product update',
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
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isArchived: true },
      });

      // Delete non-sold device units associated with this archived product
      await tx.deviceUnit.deleteMany({
        where: {
          productId: id,
          status: { not: 'SOLD' },
        },
      });
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

        // Auto-register DeviceUnit for imported product
        const existingDev = await tx.deviceUnit.findFirst({
          where: { OR: [{ barcode: prod.barcode }, { imei1: prod.barcode }] },
        });
        if (!existingDev) {
          await tx.deviceUnit.create({
            data: {
              productId: prod.id,
              barcode: prod.barcode,
              imei1: prod.barcode,
              purchasePrice: prod.purchasePrice || 0,
              customValue: prod.customValue || null,
              condition: 'NEW',
              status: 'IN_STOCK',
              purchaseDate: new Date(),
              notes: 'Bulk CSV Import Unit',
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
