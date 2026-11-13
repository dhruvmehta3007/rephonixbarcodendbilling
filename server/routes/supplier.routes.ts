import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
});

// GET /api/suppliers
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true, purchases: true } },
      },
    });
    return res.json(suppliers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch suppliers' });
  }
});

// POST /api/suppliers
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = supplierSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const supplier = await prisma.supplier.create({ data: parse.data });
    return res.status(201).json(supplier);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = supplierSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const id = req.params.id as string;
    const updated = await prisma.supplier.update({
      where: { id },
      data: parse.data,
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.supplier.delete({ where: { id } });
    return res.json({ success: true, message: 'Supplier deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete supplier' });
  }
});

// GET /api/suppliers/purchases - Purchase Orders List
router.get('/purchases', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        user: { select: { fullName: true } },
        items: { include: { product: { select: { name: true, barcode: true } } } },
      },
    });
    return res.json(purchases);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch purchases' });
  }
});

// POST /api/suppliers/purchases - Create Purchase Order
router.post('/purchases', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Purchase order must contain at least 1 item' });
    }

    let totalAmount = 0;
    const purchaseItems = items.map((i: any) => {
      const subtotal = Number(i.quantity) * Number(i.unitCost);
      totalAmount += subtotal;
      return {
        productId: i.productId,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        subtotal,
      };
    });

    const count = await prisma.purchase.count();
    const purchaseNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        supplierId,
        totalAmount,
        status: 'PENDING',
        notes,
        userId: req.user?.id,
        items: {
          create: purchaseItems,
        },
      },
      include: { items: true, supplier: true },
    });

    return res.status(201).json(purchase);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create purchase order' });
  }
});

// POST /api/suppliers/purchases/:id/receive - Confirm Received Stock & Update Inventory
router.post('/purchases/:id/receive', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (purchase.status === 'RECEIVED') {
      return res.status(400).json({ error: 'This purchase order has already been received.' });
    }

    // Atomic transaction: mark as RECEIVED, increment inventory, write movements
    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });

      for (const item of purchase.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const newStock = prod.currentStock + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: newStock,
              purchasePrice: item.unitCost, // Update latest purchase cost
            },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'PURCHASE',
              quantityChange: item.quantity,
              stockBefore: prod.currentStock,
              stockAfter: newStock,
              reason: `Received Purchase Order #${purchase.purchaseNumber}`,
              referenceId: purchase.id,
              userId: req.user?.id,
            },
          });
        }
      }
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'STOCK_RECEIPT',
      entity: 'Purchase',
      entityId: id,
      details: `Received Purchase Order #${purchase.purchaseNumber} and updated stock.`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Stock received and inventory updated.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to confirm stock receipt' });
  }
});

export default router;
