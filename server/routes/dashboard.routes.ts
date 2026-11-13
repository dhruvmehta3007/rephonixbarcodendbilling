import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total active products
    const totalProducts = await prisma.product.count({
      where: { isArchived: false },
    });

    // 2. Total inventory units in warehouse/store
    const inventorySum = await prisma.product.aggregate({
      where: { isArchived: false },
      _sum: { currentStock: true },
    });
    const totalInventory = inventorySum._sum.currentStock || 0;

    // 3. Today's sales & order count
    const todaySalesData = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'COMPLETED',
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const todaySales = todaySalesData._sum.totalAmount || 0;
    const todayTransactions = todaySalesData._count.id || 0;

    // 4. Low stock products (stock <= threshold)
    const allProducts = await prisma.product.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        barcode: true,
        currentStock: true,
        minStockThreshold: true,
        sellingPrice: true,
        unit: true,
      },
    });

    const lowStockProducts = allProducts.filter(
      (p) => p.currentStock > 0 && p.currentStock <= p.minStockThreshold
    );
    const outOfStockProducts = allProducts.filter((p) => p.currentStock <= 0);

    // 5. Recent 5 transactions
    const recentTransactions = await prisma.sale.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        cashier: { select: { fullName: true } },
        customer: { select: { name: true, phone: true } },
        items: { select: { productName: true, quantity: true, total: true } },
      },
    });

    // 6. Best selling products (grouped by productId from completed sales)
    const topSaleItems = await prisma.saleItem.groupBy({
      by: ['productId', 'productName', 'barcode'],
      _sum: { quantity: true, total: true },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 5,
    });

    // 7. Last 7 Days Sales Trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastWeekSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // Bucket sales into the 7 days
    const trendMap: { [key: string]: { date: string; sales: number; count: number } } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      trendMap[key] = { date: label, sales: 0, count: 0 };
    }

    for (const sale of pastWeekSales) {
      const key = sale.createdAt.toISOString().split('T')[0];
      if (trendMap[key]) {
        trendMap[key].sales += sale.totalAmount;
        trendMap[key].count += 1;
      }
    }

    const salesTrend = Object.values(trendMap);

    return res.json({
      totalProducts,
      totalInventory,
      todaySales,
      todayTransactions,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 8),
      outOfStockProducts: outOfStockProducts.slice(0, 8),
      recentTransactions,
      bestSellers: topSaleItems.map((item) => ({
        id: item.productId,
        name: item.productName,
        barcode: (item as any).barcode || '',
        soldQuantity: item._sum.quantity || 0,
        totalRevenue: item._sum.total || 0,
      })),
      salesTrend,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch dashboard metrics' });
  }
});

export default router;
