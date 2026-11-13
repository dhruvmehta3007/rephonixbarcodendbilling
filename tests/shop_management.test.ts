import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { prisma } from '../server/db';
import bcrypt from 'bcryptjs';

let adminToken = '';
let cashierToken = '';
let testProductId = '';
let testSku = `TEST-${Date.now()}`;
let testBarcode = `890${Date.now().toString().slice(-9)}`;

beforeAll(async () => {
  // Ensure test users exist
  const adminPass = await bcrypt.hash('admin123', 10);
  const cashierPass = await bcrypt.hash('cashier123', 10);

  await prisma.user.upsert({
    where: { username: 'testadmin' },
    update: { passwordHash: adminPass },
    create: {
      username: 'testadmin',
      fullName: 'Test Admin',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { username: 'testcashier' },
    update: { passwordHash: cashierPass },
    create: {
      username: 'testcashier',
      fullName: 'Test Cashier',
      passwordHash: cashierPass,
      role: 'CASHIER',
    },
  });

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testadmin', password: 'admin123' });
  adminToken = adminLogin.body.token;

  // Login as cashier
  const cashierLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testcashier', password: 'cashier123' });
  cashierToken = cashierLogin.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('1. Product Management & Validation Tests', () => {
  it('should create a new product with opening inventory ledger entry', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Vitest Test Phone 5G',
        sku: testSku,
        barcode: testBarcode,
        purchasePrice: 10000,
        sellingPrice: 15000,
        taxRate: 18,
        currentStock: 10,
        minStockThreshold: 3,
        unit: 'pcs',
      });

    expect(res.status).toBe(201);
    expect(res.body.sku).toBe(testSku);
    expect(res.body.currentStock).toBe(10);
    testProductId = res.body.id;

    // Verify opening inventory movement ledger
    const movement = await prisma.inventoryMovement.findFirst({
      where: { productId: testProductId, type: 'OPENING' },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantityChange).toBe(10);
  });

  it('should reject creating a duplicate SKU', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate SKU Product',
        sku: testSku,
        purchasePrice: 500,
        sellingPrice: 1000,
        taxRate: 18,
        currentStock: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already exists');
  });

  it('should reject cashier from creating products (RBAC enforcement)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Unauthorized Product',
        sku: `UNAUTH-${Date.now()}`,
        purchasePrice: 100,
        sellingPrice: 200,
        taxRate: 18,
        currentStock: 2,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Admin privileges required');
  });
});

describe('2. Inventory Tracking & Atomic Adjustments', () => {
  it('should manually adjust inventory and record movement with reason', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: testProductId,
        quantityChange: 5,
        type: 'ADJUSTMENT',
        reason: 'Shipment restock verification',
      });

    expect(res.status).toBe(200);
    expect(res.body.product.currentStock).toBe(15);
    expect(res.body.movement.stockBefore).toBe(10);
    expect(res.body.movement.stockAfter).toBe(15);
  });

  it('should prevent reducing stock below zero when negative stock is disallowed', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: testProductId,
        quantityChange: -100, // Excessive reduction
        type: 'DAMAGE',
        reason: 'Accidental breakage',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient stock');
  });
});

describe('3. POS Billing & Checkout Workflows', () => {
  it('should lookup product by barcode scanner input', async () => {
    const res = await request(app)
      .get(`/api/pos/lookup?query=${testBarcode}`)
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].sku).toBe(testSku);
  });

  it('should reject checkout if requested quantity exceeds available stock', async () => {
    const res = await request(app)
      .post('/api/pos/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: testProductId, quantity: 999 }],
        paymentMethod: 'CASH',
        cashReceived: 10000000,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient stock');
  });

  let createdInvoiceId = '';

  it('should successfully complete sale, calculate tax, reduce inventory, and record ledger', async () => {
    const initialProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    const stockBeforeSale = initialProduct!.currentStock; // 15

    const qtyToBuy = 3;
    const unitPrice = initialProduct!.sellingPrice; // 15000
    const lineSubtotal = unitPrice * qtyToBuy; // 45000
    const lineTax = (lineSubtotal * 18) / 100; // 8100
    const expectedTotal = lineSubtotal + lineTax; // 53100

    const res = await request(app)
      .post('/api/pos/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: testProductId, quantity: qtyToBuy, discount: 0 }],
        paymentMethod: 'CASH',
        cashReceived: 60000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.sale.totalAmount).toBe(expectedTotal);
    expect(res.body.sale.changeAmount).toBe(60000 - expectedTotal);
    createdInvoiceId = res.body.sale.id;

    // Verify inventory reduced atomically
    const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(productAfter!.currentStock).toBe(stockBeforeSale - qtyToBuy);

    // Verify SALE movement ledger recorded
    const saleMovement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: testProductId,
        type: 'SALE',
        referenceId: createdInvoiceId,
      },
    });
    expect(saleMovement).toBeDefined();
    expect(saleMovement?.quantityChange).toBe(-qtyToBuy);
  });

  it('should process controlled refund and atomically restore stock', async () => {
    const productBeforeRefund = await prisma.product.findUnique({ where: { id: testProductId } });
    const stockBeforeRefund = productBeforeRefund!.currentStock;

    const res = await request(app)
      .post(`/api/sales/${createdInvoiceId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Customer changed mind within 7 days' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sale.status).toBe('REFUNDED');

    // Verify stock restored (+3)
    const productAfterRefund = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(productAfterRefund!.currentStock).toBe(stockBeforeRefund + 3);

    // Verify RETURN movement ledger
    const returnMovement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: testProductId,
        type: 'RETURN',
        referenceId: createdInvoiceId,
      },
    });
    expect(returnMovement).toBeDefined();
    expect(returnMovement?.quantityChange).toBe(3);
  });
});
