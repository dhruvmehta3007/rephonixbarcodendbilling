import { prisma } from './db';
import bcrypt from 'bcryptjs';

/**
 * Automatically initializes and verifies permanent partner and shop owner credentials
 * on every server startup. If they are missing or their password hash changed, they
 * are immediately restored and kept permanent.
 */
export async function ensurePermanentCredentials() {
  try {
    // 1. Permanent Partner Account
    const partnerHash = await bcrypt.hash('partner2026', 10);
    await prisma.user.upsert({
      where: { username: 'partner' },
      update: {
        passwordHash: partnerHash,
        role: 'PARTNER',
        isActive: true,
        fullName: 'Garvit Madan (Partner)',
      },
      create: {
        username: 'partner',
        passwordHash: partnerHash,
        role: 'PARTNER',
        isActive: true,
        fullName: 'Garvit Madan (Partner)',
      },
    });

    // 2. Permanent Shop Owner Account
    const shopOwnerHash = await bcrypt.hash('test123', 10);
    await prisma.user.upsert({
      where: { username: 'test' },
      update: {
        passwordHash: shopOwnerHash,
        role: 'ADMIN',
        isActive: true,
        fullName: 'Shop Owner (Test)',
        email: 'test@shopowner.com',
      },
      create: {
        username: 'test',
        passwordHash: shopOwnerHash,
        role: 'ADMIN',
        isActive: true,
        fullName: 'Shop Owner (Test)',
        email: 'test@shopowner.com',
      },
    });

    // 3. Ensure Default Category
    await prisma.category.upsert({
      where: { slug: 'smartphones' },
      update: {},
      create: {
        name: 'Smartphones & Flagships',
        slug: 'smartphones',
        description: 'Brand new and certified premium mobile devices',
      },
    });

    // 4. Ensure Default Shop Settings with Rephonix & support@rephonix.in
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
      },
    });

    console.log('✅ Permanent credentials verified & active:');
    console.log('   - Partner:    username="partner", password="partner2026"');
    console.log('   - Shop Owner: username="test",    password="test123"');
  } catch (err: any) {
    console.error('Failed to ensure permanent credentials on startup:', err.message);
  }
}
