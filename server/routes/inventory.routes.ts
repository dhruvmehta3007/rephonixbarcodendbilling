import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

// Validation for manual inventory adjustment
const adjustSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityChange: z.number().int().refine((val) => val !== 0, 'Quantity change cannot be zero'),
  type: z.enum(['ADJUSTMENT', 'DAMAGE', 'RETURN', 'PURCHASE']),
  reason: z.string().min(3, 'Adjustment reason must be at least 3 characters'),
});

// GET /api/inventory/movements - Full immutable stock movement ledger
router.get('/movements', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, type, limit = '100', page = '1' } = req.query;

    const where: any = {};
    if (productId && typeof productId === 'string') {
      where.productId = productId;
    }
    if (type && typeof type === 'string' && type !== 'all') {
      where.type = type;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, barcode: true, unit: true } },
          user: { select: { id: true, fullName: true, username: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return res.json({
      data: movements,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch inventory ledger' });
  }
});

// POST /api/inventory/adjust - Atomic manual stock adjustment
router.post('/adjust', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = adjustSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { productId, quantityChange, type, reason } = parse.data;

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.isArchived) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check shop settings for negative stock prevention
    const settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });
    const allowNegative = settings?.allowNegativeStock ?? false;

    const newStock = product.currentStock + quantityChange;
    if (newStock < 0 && !allowNegative) {
      return res.status(400).json({
        error: `Insufficient stock. Current stock is ${product.currentStock}, cannot reduce by ${Math.abs(quantityChange)}.`,
      });
    }

    // Atomic update of stock and ledger creation
    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          type,
          quantityChange,
          stockBefore: product.currentStock,
          stockAfter: newStock,
          reason,
          userId: req.user?.id,
        },
      });

      return { product: updatedProduct, movement };
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'STOCK_ADJUSTMENT',
      entity: 'Inventory',
      entityId: productId,
      details: `${type} on "${product.name}" (${quantityChange > 0 ? '+' : ''}${quantityChange} units). Reason: ${reason}. New Stock: ${newStock}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Inventory successfully updated',
      product: result.product,
      movement: result.movement,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to adjust stock' });
  }
});

// GET /api/inventory/alerts - Low & Out of stock alerts
router.get('/alerts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        barcode: true,
        currentStock: true,
        minStockThreshold: true,
        sellingPrice: true,
        unit: true,
        category: { select: { name: true } },
      },
    });

    const lowStock = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockThreshold);
    const outOfStock = products.filter((p) => p.currentStock <= 0);

    return res.json({
      lowStock,
      outOfStock,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch inventory alerts' });
  }
});

export default router;
