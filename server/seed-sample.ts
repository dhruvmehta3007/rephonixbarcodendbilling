import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedSampleProducts() {
  console.log('Seeding 4 sensible smartphone products with 15-digit IMEIs and 5-6 digit label codes...');

  // 1. Clean existing products, units, transactions
  await prisma.deviceUnit.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.product.deleteMany({});

  // 2. Ensure Shop Settings
  await prisma.shopSettings.upsert({
    where: { id: 'default' },
    update: {
      shopName: 'The Cell Point',
      email: 'contact@thecellpoint.com',
      receiptFooter: 'Thank you for shopping with The Cell Point! 7-day hassle free replacement on certified devices.',
    },
    create: {
      id: 'default',
      shopName: 'The Cell Point',
      address: 'Shop #14, Ground Floor, Galaxy Tech Hub, MG Road, Mumbai - 400001',
      phone: '+91 98765 43210',
      email: 'contact@thecellpoint.com',
      gstin: '27AAAAA0000A1Z5',
      currencySymbol: '₹',
      taxRateDefault: 18.0,
      receiptFooter: 'Thank you for shopping with The Cell Point! 7-day hassle free replacement on certified devices.',
      allowNegativeStock: false,
    },
  });

  // 3. Ensure Single Admin User (Brij Bhushan)
  await prisma.user.deleteMany({
    where: {
      username: {
        notIn: ['admin'],
      },
    },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { 
      passwordHash: adminPassword,
      fullName: 'Brij Bhushan',
      email: 'brijbhushan@thecellpoint.com',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      username: 'admin',
      email: 'brijbhushan@thecellpoint.com',
      fullName: 'Brij Bhushan',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // 4. Ensure Category
  const catPhones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: { name: 'Smartphones & Flagships' },
    create: {
      name: 'Smartphones & Flagships',
      slug: 'smartphones',
      description: 'Brand new and certified premium mobile devices',
    },
  });

  // 5. 4 Sensible Smartphone Products with 15-digit IMEIs and 5 to 6 digit label values
  const products = [
    {
      name: 'Apple iPhone 15 128GB',
      barcode: '354892110293847',
      customValue: '52400', // 5-digit label value
      description: 'Dynamic Island, 48MP Main Camera, A16 Bionic, USB-C',
      categoryId: catPhones.id,
      purchasePrice: 58500.0,
      sellingPrice: 69900.0,
      taxRate: 18.0,
      minStockThreshold: 1,
      unit: 'pcs',
      units: [
        {
          imei1: '354892110293847',
          serialNumber: 'F2LQC019PL2',
          customValue: '52400',
          purchasePrice: 58500.0,
          storage: '128GB',
        },
        {
          imei1: '354892110293855',
          serialNumber: 'F2LQC020PL3',
          customValue: '51800',
          purchasePrice: 57900.0,
          storage: '128GB',
        },
      ],
    },
    {
      name: 'Apple iPhone 15 Pro Max 256GB',
      barcode: '359281048291039',
      customValue: '128500', // 6-digit label value
      description: 'Grade 5 Titanium, A17 Pro Chip, 5x Optical Telephoto, Action Button',
      categoryId: catPhones.id,
      purchasePrice: 134000.0,
      sellingPrice: 154900.0,
      taxRate: 18.0,
      minStockThreshold: 1,
      unit: 'pcs',
      units: [
        {
          imei1: '359281048291039',
          serialNumber: 'H0KQM910PL9',
          customValue: '128500',
          purchasePrice: 134000.0,
          storage: '256GB',
        },
        {
          imei1: '359281048291047',
          serialNumber: 'H0KQM911PL0',
          customValue: '126900',
          purchasePrice: 132500.0,
          storage: '256GB',
        },
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      barcode: '356291048271029',
      customValue: '112000', // 6-digit label value
      description: 'Snapdragon 8 Gen 3, Galaxy AI, 200MP Quad Tele System, Built-in S-Pen',
      categoryId: catPhones.id,
      purchasePrice: 118000.0,
      sellingPrice: 139999.0,
      taxRate: 18.0,
      minStockThreshold: 1,
      unit: 'pcs',
      units: [
        {
          imei1: '356291048271029',
          serialNumber: 'R5CW41098AC1',
          customValue: '112000',
          purchasePrice: 118000.0,
          storage: '512GB',
        },
        {
          imei1: '356291048271037',
          serialNumber: 'R5CW41098AC2',
          customValue: '109500',
          purchasePrice: 115500.0,
          storage: '512GB',
        },
      ],
    },
    {
      name: 'OnePlus 12 256GB',
      barcode: '864910284719283',
      customValue: '48900', // 5-digit label value
      description: 'Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera, 100W SUPERVOOC, 5400mAh',
      categoryId: catPhones.id,
      purchasePrice: 54000.0,
      sellingPrice: 64999.0,
      taxRate: 18.0,
      minStockThreshold: 1,
      unit: 'pcs',
      units: [
        {
          imei1: '864910284719283',
          serialNumber: 'OP12A908BC2',
          customValue: '48900',
          purchasePrice: 54000.0,
          storage: '256GB',
        },
        {
          imei1: '864910284719291',
          serialNumber: 'OP12A908BC3',
          customValue: '47500',
          purchasePrice: 52800.0,
          storage: '256GB',
        },
      ],
    },
  ];

  for (const p of products) {
    const { units, ...productData } = p;
    const count = units.length;

    const createdProduct = await prisma.product.create({
      data: {
        ...productData,
        currentStock: count,
      },
    });

    // Opening inventory ledger
    await prisma.inventoryMovement.create({
      data: {
        productId: createdProduct.id,
        type: 'OPENING',
        quantityChange: count,
        stockBefore: 0,
        stockAfter: count,
        reason: 'Store opening inventory intake',
        userId: admin.id,
      },
    });

    // Create individual tracked units
    for (const u of units) {
      await prisma.deviceUnit.create({
        data: {
          productId: createdProduct.id,
          imei1: u.imei1,
          serialNumber: u.serialNumber,
          barcode: u.imei1,
          customValue: u.customValue,
          storage: u.storage,
          condition: 'NEW',
          status: 'IN_STOCK',
          purchasePrice: u.purchasePrice || productData.purchasePrice,
          notes: 'Flagship stock intake',
        },
      });
    }
  }

  const totalProds = await prisma.product.count();
  const totalUnits = await prisma.deviceUnit.count();
  console.log(`Seeded ${totalProds} sensible products with ${totalUnits} tracked device units.`);
}

if (process.argv[1]?.endsWith('seed-sample.ts') || process.argv[1]?.endsWith('seed-sample.js')) {
  seedSampleProducts()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
