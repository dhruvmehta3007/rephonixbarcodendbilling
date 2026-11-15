import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

// GET /api/sales - List sales history
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, startDate, endDate, page = '1', limit = '50' } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } },
        { items: { some: { barcode: { contains: q } } } },
        { items: { some: { productName: { contains: q } } } },
        {
          items: {
            some: {
              devices: {
                some: {
                  OR: [
                    { imei1: { contains: q } },
                    { imei2: { contains: q } },
                    { barcode: { contains: q } },
                    { serialNumber: { contains: q } },
                  ],
                },
              },
            },
          },
        },
      ];
    }

    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, fullName: true, username: true } },
          items: {
            include: {
              devices: {
                select: { id: true, imei1: true, imei2: true, serialNumber: true, barcode: true },
              },
            },
          },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return res.json({
      data: sales,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch sales' });
  }
});

// GET /api/sales/:id - Invoice details
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: { select: { fullName: true, username: true } },
        items: {
          include: {
            devices: {
              select: { id: true, imei1: true, imei2: true, serialNumber: true, barcode: true },
            },
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });

    return res.json({ sale, settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch invoice' });
  }
});

// POST /api/sales/:id/refund - Controlled refund & inventory restoration
router.post('/:id/refund', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason = 'Customer return / order cancelled' } = req.body;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.status === 'REFUNDED') {
      return res.status(400).json({ error: 'This invoice has already been refunded.' });
    }

    // Atomic transaction:
    // 1. Mark sale as REFUNDED
    // 2. Increment stock back for each product
    // 3. Create RETURN inventory movements
    // 4. Adjust customer total spend
    const refundedSale = await prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          notes: `${sale.notes ? sale.notes + ' | ' : ''}Refund Reason: ${reason}`,
        },
      });

      for (const item of sale.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const newStock = prod.currentStock + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantityChange: item.quantity,
              stockBefore: prod.currentStock,
              stockAfter: newStock,
              reason: `Refund for Invoice #${sale.invoiceNumber}: ${reason}`,
              referenceId: sale.id,
              userId: req.user?.id,
            },
          });
        }
      }

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { totalSpent: { decrement: sale.totalAmount } },
        });
      }

      return updated;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'SALE_REFUND',
      entity: 'Sale',
      entityId: id,
      details: `Refunded Invoice #${sale.invoiceNumber} for ₹${sale.totalAmount}. Reason: ${reason}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Invoice #${sale.invoiceNumber} refunded and inventory restored.`,
      sale: refundedSale,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Refund failed' });
  }
});

export default router;
