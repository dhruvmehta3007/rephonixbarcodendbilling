import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

// Validation for checkout
const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  deviceUnitId: z.string().optional().nullable(),
  deviceBarcode: z.string().optional().nullable(),
  imei: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  discount: z.number().min(0).default(0), // line item discount in currency
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Cart cannot be empty'),
  customerId: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'SPLIT']).default('CASH'),
  cashReceived: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

// GET /api/pos/lookup - Instant barcode scanner & search lookup
router.get('/lookup', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.json([]);
    }

    // First try exact device barcode or IMEI lookup
    const device = await prisma.deviceUnit.findFirst({
      where: {
        status: 'IN_STOCK',
        OR: [
          { barcode: query },
          { imei1: query },
          { imei2: query },
          { serialNumber: query },
        ],
      },
      include: {
        product: {
          include: { category: { select: { name: true } } },
        },
      },
    });

    if (device && device.product) {
      // Return the product enriched with the scanned device unit reference
      return res.json([
        {
          ...device.product,
          sku: device.serialNumber || device.product.barcode,
          deviceUnitId: device.id,
          deviceBarcode: device.barcode,
          deviceImei1: device.imei1,
          deviceSerial: device.serialNumber,
          unitCost: device.purchasePrice || device.product.purchasePrice,
        },
      ]);
    }

    // First try exact barcode match (ideal for physical handheld barcode scanner)
    let products = await prisma.product.findMany({
      where: {
        barcode: query,
        isArchived: false,
      },
      include: {
        category: { select: { name: true } },
        devices: { take: 1, select: { serialNumber: true } },
      },
      take: 10,
    });

    // If no exact barcode match, search barcode substring or name
    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: {
          isArchived: false,
          OR: [
            { barcode: { contains: query } },
            { name: { contains: query } },
          ],
        },
        include: {
          category: { select: { name: true } },
          devices: { take: 1, select: { serialNumber: true } },
        },
        take: 15,
      });
    }

    return res.json(products.map((p) => ({ ...p, sku: p.devices?.[0]?.serialNumber || p.barcode })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Lookup failed' });
  }
});

// Helper to round decimal to 2 places
const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// POST /api/pos/checkout - Atomic sale transaction
router.post('/checkout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = checkoutSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { items, customerId, paymentMethod, cashReceived, notes } = parse.data;

    // Check store settings regarding negative inventory
    const settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });
    const allowNegative = settings?.allowNegativeStock ?? false;

    // 1. Fetch current database records for all items in cart (SOURCE OF TRUTH)
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, isArchived: false },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validate that all products exist and check stock
    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return res.status(400).json({ error: `Product with ID ${item.productId} was not found.` });
      }

      if (!allowNegative && prod.currentStock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${prod.name}". In stock: ${prod.currentStock}, requested: ${item.quantity}.`,
        });
      }
    }

    // 2. Perform accurate decimal calculations on server side
    let orderSubtotal = 0;
    let orderTax = 0;
    let orderDiscount = 0;

    const calculatedItems = items.map((cartItem) => {
      const prod = productMap.get(cartItem.productId)!;
      const unitPrice = prod.sellingPrice;
      const unitCost = prod.purchasePrice;
      const quantity = cartItem.quantity;
      const discount = Math.min(unitPrice * quantity, round2(cartItem.discount || 0));

      const lineSubtotal = round2(unitPrice * quantity - discount);
      const taxRate = prod.taxRate || 0;
      const lineTax = round2((lineSubtotal * taxRate) / 100);
      const lineTotal = round2(lineSubtotal + lineTax);

      orderSubtotal += lineSubtotal;
      orderTax += lineTax;
      orderDiscount += discount;

      return {
        productId: prod.id,
        productName: prod.name,
        barcode: cartItem.imei || cartItem.deviceBarcode || prod.barcode,
        unitPrice,
        unitCost,
        quantity,
        discount,
        taxRate,
        taxAmount: lineTax,
        subtotal: lineSubtotal,
        total: lineTotal,
      };
    });

    orderSubtotal = round2(orderSubtotal);
    orderTax = round2(orderTax);
    orderDiscount = round2(orderDiscount);
    const orderTotal = round2(orderSubtotal + orderTax);

    // Validate cash received if paying with cash
    let changeAmount = 0;
    if (paymentMethod === 'CASH') {
      if (cashReceived < orderTotal) {
        return res.status(400).json({
          error: `Insufficient cash received. Total is ₹${orderTotal}, received ₹${cashReceived}.`,
        });
      }
      changeAmount = round2(cashReceived - orderTotal);
    }

    // 3. Generate Sequential Invoice Number (e.g. INV-2026-0001)
    const today = new Date();
    const year = today.getFullYear();
    const countSales = await prisma.sale.count();
    const invoiceNumber = `INV-${year}-${String(countSales + 1).padStart(5, '0')}`;

    // 4. Atomic Database Transaction:
    // - Create Sale
    // - Create SaleItem snapshots
    // - Decrement stock atomically
    // - Create InventoryMovement ledger entries
    // - Update customer totalSpent
    const saleResult = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId,
          subtotal: orderSubtotal,
          discountAmount: orderDiscount,
          taxAmount: orderTax,
          totalAmount: orderTotal,
          paymentMethod,
          cashReceived: paymentMethod === 'CASH' ? cashReceived : orderTotal,
          changeAmount,
          status: 'COMPLETED',
          cashierId: req.user?.id,
          notes,
          items: {
            create: calculatedItems,
          },
        },
        include: {
          items: true,
          customer: true,
          cashier: { select: { fullName: true, username: true } },
        },
      });

      // Reduce inventory & record movements
      for (const item of calculatedItems) {
        const currentProd = productMap.get(item.productId)!;
        const newStock = currentProd.currentStock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantityChange: -item.quantity,
            stockBefore: currentProd.currentStock,
            stockAfter: newStock,
            reason: `POS Sale #${invoiceNumber}`,
            referenceId: sale.id,
            userId: req.user?.id,
          },
        });

        // Mark corresponding DeviceUnit(s) as SOLD
        const matchedCartItem = items.find((c) => c.productId === item.productId && (c.imei === item.barcode || c.deviceBarcode === item.barcode));
        const createdSaleItem = sale.items.find((si) => si.productId === item.productId && si.barcode === item.barcode);
        if (matchedCartItem?.deviceUnitId) {
          await tx.deviceUnit.update({
            where: { id: matchedCartItem.deviceUnitId },
            data: {
              status: 'SOLD',
              soldPrice: item.unitPrice,
              soldAt: new Date(),
              saleItemId: createdSaleItem?.id || null,
            },
          });
        } else {
          const availableUnits = await tx.deviceUnit.findMany({
            where: { productId: item.productId, status: 'IN_STOCK' },
            take: item.quantity,
            orderBy: { purchaseDate: 'asc' },
          });
          for (const u of availableUnits) {
            await tx.deviceUnit.update({
              where: { id: u.id },
              data: {
                status: 'SOLD',
                soldPrice: item.unitPrice,
                soldAt: new Date(),
                saleItemId: createdSaleItem?.id || null,
              },
            });
          }
        }
      }

      // Update customer total spend
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { totalSpent: { increment: orderTotal } },
        });
      }

      return sale;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'SALE_CREATE',
      entity: 'Sale',
      entityId: saleResult.id,
      details: `Created Sale ${saleResult.invoiceNumber} for ₹${saleResult.totalAmount} (${paymentMethod})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      sale: saleResult,
      settings,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Checkout failed' });
  }
});

export default router;
