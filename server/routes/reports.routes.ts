import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/sales-summary - Comprehensive Financial & Sales Report
router.get('/sales-summary', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { status: 'COMPLETED' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { items: true },
    });

    let totalGrossSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalNetRevenue = 0;
    let totalCostOfGoodsSold = 0;

    const paymentMethods: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 },
      SPLIT: { count: 0, total: 0 },
    };

    for (const sale of sales) {
      totalGrossSales += sale.subtotal + sale.discountAmount;
      totalDiscount += sale.discountAmount;
      totalTax += sale.taxAmount;
      totalNetRevenue += sale.totalAmount;

      const pm = sale.paymentMethod || 'CASH';
      if (!paymentMethods[pm]) {
        paymentMethods[pm] = { count: 0, total: 0 };
      }
      paymentMethods[pm].count += 1;
      paymentMethods[pm].total += sale.totalAmount;

      for (const item of sale.items) {
        totalCostOfGoodsSold += (item.unitCost || 0) * item.quantity;
      }
    }

    // Fetch refunds in same date range
    const refundWhere: any = { status: 'REFUNDED' };
    if (where.createdAt) refundWhere.createdAt = where.createdAt;

    const refundedSales = await prisma.sale.findMany({
      where: refundWhere,
      select: { totalAmount: true },
    });
    const totalRefundedAmount = refundedSales.reduce((acc, s) => acc + s.totalAmount, 0);

    const grossProfit = totalNetRevenue - totalCostOfGoodsSold;
    const profitMargin = totalNetRevenue > 0 ? (grossProfit / totalNetRevenue) * 100 : 0;

    return res.json({
      summary: {
        totalOrders: sales.length,
        totalGrossSales: Math.round(totalGrossSales * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
        totalCostOfGoodsSold: Math.round(totalCostOfGoodsSold * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 10) / 10,
        totalRefunds: refundedSales.length,
        totalRefundedAmount: Math.round(totalRefundedAmount * 100) / 100,
      },
      paymentMethods,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to generate sales summary' });
  }
});

// GET /api/reports/inventory-valuation - Inventory Valuation & Assets
router.get('/inventory-valuation', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      include: { category: { select: { name: true } } },
    });

    let totalQuantity = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const valuationList = products.map((p) => {
      const stock = Math.max(0, p.currentStock);
      const costValue = stock * p.purchasePrice;
      const retailValue = stock * p.sellingPrice;
      const potentialProfit = retailValue - costValue;

      totalQuantity += stock;
      totalCostValuation += costValue;
      totalRetailValuation += retailValue;

      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category?.name || 'Uncategorized',
        currentStock: stock,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        costValue: Math.round(costValue * 100) / 100,
        retailValue: Math.round(retailValue * 100) / 100,
        potentialProfit: Math.round(potentialProfit * 100) / 100,
      };
    });

    return res.json({
      summary: {
        totalProducts: products.length,
        totalQuantity,
        totalCostValuation: Math.round(totalCostValuation * 100) / 100,
        totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
        potentialGrossProfit: Math.round((totalRetailValuation - totalCostValuation) * 100) / 100,
      },
      items: valuationList,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to calculate inventory valuation' });
  }
});

// GET /api/reports/product-sales - Product Wise Sales & Profit Breakdown
router.get('/product-sales', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { status: 'COMPLETED' },
      },
      select: {
        productId: true,
        productName: true,
        barcode: true,
        quantity: true,
        unitCost: true,
        unitPrice: true,
        subtotal: true,
        total: true,
      },
    });

    const productMap: Record<
      string,
      {
        name: string;
        barcode: string;
        quantitySold: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    > = {};

    for (const item of saleItems) {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          name: item.productName,
          barcode: item.barcode,
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }
      productMap[item.productId].quantitySold += item.quantity;
      productMap[item.productId].revenue += item.total;
      const cogs = item.unitCost * item.quantity;
      productMap[item.productId].cost += cogs;
      productMap[item.productId].profit += item.total - cogs;
    }

    const report = Object.entries(productMap).map(([id, data]) => ({
      productId: id,
      name: data.name,
      barcode: data.barcode,
      quantitySold: data.quantitySold,
      revenue: Math.round(data.revenue * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 1000) / 10 : 0,
    }));

    report.sort((a, b) => b.revenue - a.revenue);

    return res.json(report);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch product sales report' });
  }
});

export default router;
