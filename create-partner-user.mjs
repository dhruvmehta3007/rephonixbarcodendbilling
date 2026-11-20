import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const installedPrisma = new PrismaClient({
  datasources: { db: { url: 'file:C:/Users/garvi/AppData/Local/Programs/Rephonix/prisma/dev.db' } }
});

async function setup() {
  const hash = await bcrypt.hash('partner2026', 10);
  
  // 1. Setup in project dev.db
  await prisma.user.upsert({
    where: { username: 'partner' },
    update: {
      fullName: 'Garvit Madan (Partner)',
      role: 'PARTNER',
      passwordHash: hash,
      isActive: true,
    },
    create: {
      username: 'partner',
      fullName: 'Garvit Madan (Partner)',
      role: 'PARTNER',
      passwordHash: hash,
      isActive: true,
    },
  });

  // 2. Setup in installed app dev.db
  try {
    await installedPrisma.user.upsert({
      where: { username: 'partner' },
      update: {
        fullName: 'Garvit Madan (Partner)',
        role: 'PARTNER',
        passwordHash: hash,
        isActive: true,
      },
      create: {
        username: 'partner',
        fullName: 'Garvit Madan (Partner)',
        role: 'PARTNER',
        passwordHash: hash,
        isActive: true,
      },
    });
    console.log('Installed app dev.db updated with partner user');
  } catch (err) {
    console.error('Installed app db error:', err);
  }

  console.log('Partner user successfully configured!');
}

setup()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await installedPrisma.$disconnect();
  });
