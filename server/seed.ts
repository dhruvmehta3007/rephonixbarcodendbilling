import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with retail products, users, and settings...');

  // 1. Seed Shop Settings
  await prisma.shopSettings.upsert({
    where: { id: 'default' },
    update: {
      shopName: 'CellPoint Barcode',
      email: 'contact@cellpointbarcode.com',
      receiptFooter: 'Thank you for shopping with CellPoint Barcode! 7-day hassle free replacement on certified products.',
    },
    create: {
      id: 'default',
      shopName: 'CellPoint Barcode',
      address: 'Shop #14, Ground Floor, Galaxy Tech Hub, MG Road, Mumbai - 400001',
      phone: '+91 98765 43210',
      email: 'contact@cellpointbarcode.com',
      gstin: '27AAAAA0000A1Z5',
      currencySymbol: '₹',
      taxRateDefault: 18.0,
      receiptFooter: 'Thank you for shopping with CellPoint Barcode! 7-day hassle free replacement on certified products.',
      allowNegativeStock: false,
    },
  });

  // 2. Seed Users (Admin & Cashier)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { 
      passwordHash: adminPassword,
      fullName: 'Dhruv',
      email: 'dhruv@cellpointbarcode.com',
    },
    create: {
      username: 'admin',
      email: 'dhruv@cellpointbarcode.com',
      fullName: 'Dhruv',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: { passwordHash: cashierPassword },
    create: {
      username: 'cashier',
      email: 'cashier@rephonix.in',
      fullName: 'Rahul Sharma (Cashier 1)',
      passwordHash: cashierPassword,
      role: 'CASHIER',
      isActive: true,
    },
  });

  // 3. Seed Categories
  const catPhones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'Smartphones & Refurbished',
      slug: 'smartphones',
      description: 'Brand new and certified pre-owned mobile phones',
    },
  });

  const catAccessories = await prisma.category.upsert({
    where: { slug: 'accessories' },
    update: {},
    create: {
      name: 'Accessories & Chargers',
      slug: 'accessories',
      description: 'Fast chargers, cables, cases and protectors',
    },
  });

  const catAudio = await prisma.category.upsert({
    where: { slug: 'audio' },
    update: {},
    create: {
      name: 'Audio & Wearables',
      slug: 'audio',
      description: 'TWS earbuds, neckbands and smartwatches',
    },
  });

  // 4. Seed Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Apex Mobiles Distribution Ltd',
      contactPerson: 'Suresh Patil',
      phone: '+91 98200 99887',
      email: 'sales@apexdist.com',
      address: 'B-12, Electronic Wholesale Market, Lamington Road, Mumbai',
      gstin: '27AABCU9603R1ZM',
    },
  }).catch(() => null);

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Rephonix Central Warehouse Hub',
      contactPerson: 'Karan Dave',
      phone: '+91 98333 44556',
      email: 'supply@rephonix.in',
      address: 'Plot 45, MIDC Industrial Area, Navi Mumbai',
      gstin: '27AAAAA0000A1Z5',
    },
  }).catch(() => null);

  // 5. Seed Customers
  await prisma.customer.upsert({
    where: { phone: '9820011223' },
    update: {},
    create: {
      name: 'Amit Verma',
      phone: '9820011223',
      email: 'amit.verma@example.com',
      address: 'Andheri West, Mumbai',
      totalSpent: 45298.0,
    },
  });

  await prisma.customer.upsert({
    where: { phone: '9821144556' },
    update: {},
    create: {
      name: 'Priya Patel',
      phone: '9821144556',
      email: 'priya.p@example.com',
      address: 'Bandra West, Mumbai',
      totalSpent: 12499.0,
    },
  });

  // 6. Seed Products
  const productsToSeed = [
    {
      name: 'iPhone 13 Pro 128GB Graphite (Grade A Refurbished)',
      barcode: '8624510492817',
      description: 'Battery Health 91%, 6 Months Warranty, QC Passed',
      categoryId: catPhones.id,
      supplierId: supplier1?.id,
      purchasePrice: 38000.0,
      sellingPrice: 44999.0,
      taxRate: 18.0,
      currentStock: 14,
      minStockThreshold: 3,
      unit: 'pcs',
    },
    {
      name: 'Samsung Galaxy S23 256GB Phantom Black',
      barcode: '8806094772019',
      description: 'Snapdragon 8 Gen 2, 8GB RAM, 50MP Camera',
      categoryId: catPhones.id,
      supplierId: supplier1?.id,
      purchasePrice: 48000.0,
      sellingPrice: 56999.0,
      taxRate: 18.0,
      currentStock: 8,
      minStockThreshold: 2,
      unit: 'pcs',
    },
    {
      name: 'CellPoint 20W PD Type-C Fast Charger',
      barcode: '8901030882194',
      description: 'USB-C Power Delivery, BIS Certified, Overheat Protection',
      categoryId: catAccessories.id,
      supplierId: supplier2?.id,
      purchasePrice: 280.0,
      sellingPrice: 699.0,
      taxRate: 18.0,
      currentStock: 48,
      minStockThreshold: 10,
      unit: 'pcs',
    },
    {
      name: 'Braided Type-C to Lightning Cable 1.5m',
      barcode: '8901030882200',
      description: 'Nylon Braided 480Mbps Data Sync & Fast Charge',
      categoryId: catAccessories.id,
      supplierId: supplier2?.id,
      purchasePrice: 95.0,
      sellingPrice: 299.0,
      taxRate: 18.0,
      currentStock: 35,
      minStockThreshold: 8,
      unit: 'pcs',
    },
    {
      name: 'Boat Airdopes 141 ANC Wireless Earbuds',
      barcode: '8904330922114',
      description: 'Active Noise Cancellation, 42 Hours Playback, IPX4',
      categoryId: catAudio.id,
      supplierId: supplier1?.id,
      purchasePrice: 850.0,
      sellingPrice: 1499.0,
      taxRate: 18.0,
      currentStock: 22,
      minStockThreshold: 5,
      unit: 'pcs',
    },
    {
      name: 'OnePlus Nord CE 3 Lite 5G 128GB Pastel Lime',
      barcode: '6921815622119',
      description: '108MP Camera, 67W SuperVOOC, 5000mAh Battery',
      categoryId: catPhones.id,
      supplierId: supplier1?.id,
      purchasePrice: 14800.0,
      sellingPrice: 17999.0,
      taxRate: 18.0,
      currentStock: 2, // Low stock!
      minStockThreshold: 4,
      unit: 'pcs',
    },
    {
      name: 'Ultra-Clear 9H Tempered Glass Screen Guard',
      barcode: '8901030882217',
      description: 'Oleophobic anti-fingerprint coating, Edge to edge fit',
      categoryId: catAccessories.id,
      supplierId: supplier2?.id,
      purchasePrice: 35.0,
      sellingPrice: 149.0,
      taxRate: 18.0,
      currentStock: 85,
      minStockThreshold: 15,
      unit: 'pcs',
    },
    {
      name: 'Magnetic Wireless Power Bank 10000mAh',
      barcode: '8901030882224',
      description: '15W Fast Qi Wireless + 20W PD Output',
      categoryId: catAccessories.id,
      supplierId: supplier2?.id,
      purchasePrice: 950.0,
      sellingPrice: 1899.0,
      taxRate: 18.0,
      currentStock: 0, // Out of stock!
      minStockThreshold: 5,
      unit: 'pcs',
    },
  ];

  for (const item of productsToSeed) {
    const existing = await prisma.product.findUnique({ where: { barcode: item.barcode } });
    if (!existing) {
      const created = await prisma.product.create({ data: item });
      // Create Opening Stock Ledger Entry
      await prisma.inventoryMovement.create({
        data: {
          productId: created.id,
          type: 'OPENING',
          quantityChange: created.currentStock,
          stockBefore: 0,
          stockAfter: created.currentStock,
          reason: 'Initial store inventory opening stock entry',
          userId: admin.id,
        },
      });
    }
  }

  // 7. Seed Sample Completed Sale for Dashboard Analytics
  const sampleProduct = await prisma.product.findFirst({ where: { barcode: '8901030882194' } });
  if (sampleProduct) {
    const invNumber = 'INV-2026-0001';
    const existingSale = await prisma.sale.findUnique({ where: { invoiceNumber: invNumber } });
    if (!existingSale) {
      const unitPrice = sampleProduct.sellingPrice;
      const qty = 2;
      const subtotal = unitPrice * qty;
      const taxRate = 18.0;
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      await prisma.sale.create({
        data: {
          invoiceNumber: invNumber,
          subtotal,
          discountAmount: 0.0,
          taxAmount,
          totalAmount,
          paymentMethod: 'UPI',
          cashReceived: totalAmount,
          changeAmount: 0.0,
          status: 'COMPLETED',
          cashierId: cashier.id,
          notes: 'Walk-in UPI transaction',
          items: {
            create: [
              {
                productId: sampleProduct.id,
                productName: sampleProduct.name,
                barcode: sampleProduct.barcode,
                unitPrice,
                unitCost: sampleProduct.purchasePrice,
                quantity: qty,
                discount: 0.0,
                taxRate,
                taxAmount,
                subtotal,
                total: totalAmount,
              },
            ],
          },
        },
      });
    }
  }

  // 7. Seed Sample Tracked Devices (with individual IMEI, bought price, purchase date & supplier)
  const phoneProd = await prisma.product.findFirst({
    where: { barcode: '8624510492817' },
  });

  if (phoneProd) {
    const existingDevice = await prisma.deviceUnit.findFirst({
      where: { barcode: '862451049281729' },
    });

    if (!existingDevice) {
      await prisma.deviceUnit.create({
        data: {
          productId: phoneProd.id,
          imei1: '862451049281729',
          imei2: '862451049281737',
          serialNumber: 'DN6W80QG0D',
          barcode: '862451049281729',
          color: 'Natural Titanium',
          storage: '128 GB',
          condition: 'NEW',
          status: 'IN_STOCK',
          purchasePrice: 112000.0,
          purchaseDate: new Date('2026-10-15T10:30:00Z'),
          supplierId: supplier1?.id,
          purchaseInvoiceNo: 'APL-DIST-8849',
          notes: 'Batch A - Sealed Apple India Warranty Unit',
        },
      });
      console.log('Seeded sample tracked device unit (IMEI: 862451049281729)');
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
