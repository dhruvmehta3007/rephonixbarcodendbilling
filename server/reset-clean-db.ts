import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function resetToCleanDatabase() {
  console.log('--- PURGING ALL CATALOG & TRANSACTIONAL DATA FOR CLEAN RESET ---');

  // 1. Wipe all dependent and catalog records (preserve users & accounts)
  await prisma.deviceUnit.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  // Do NOT delete users! Keep active partner and owner accounts untouched.

  // 2. Ensure Default Shop Settings
  await prisma.shopSettings.upsert({
    where: { id: 'default' },
    update: {
      shopName: 'Rephonix',
      email: 'support@rephonix.in',
    },
    create: {
      id: 'default',
      shopName: 'Rephonix',
      address: 'Moti Nagar, New Delhi',
      phone: '+91 98765 43210',
      email: 'support@rephonix.in',
      currencySymbol: '₹',
      taxRateDefault: 0.0,
      receiptFooter: 'Thank you for shopping with Rephonix! 7-day hassle free replacement on certified devices.',
      allowNegativeStock: false,
    },
  });

  // 3. Ensure Category
  await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: { name: 'Smartphones & Flagships' },
    create: {
      name: 'Smartphones & Flagships',
      slug: 'smartphones',
      description: 'Brand new and certified premium mobile devices',
    },
  });

  const productCount = await prisma.product.count();
  const deviceCount = await prisma.deviceUnit.count();
  const saleCount = await prisma.sale.count();

  console.log(`Pure clean database ready: ${productCount} products, ${deviceCount} devices, ${saleCount} sales.`);
  return { productCount, deviceCount, saleCount };
}

// When executed directly from CLI
if (process.argv[1]?.endsWith('reset-clean-db.ts') || process.argv[1]?.endsWith('reset-clean-db.js')) {
  resetToCleanDatabase()
    .catch((e) => {
      console.error('Reset error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
