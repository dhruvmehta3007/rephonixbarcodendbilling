import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { authenticate, requirePartner, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

// Master partner pin: default 9876 or hash if configured
const DEFAULT_PARTNER_PIN = '9876';

const partnerConfigSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits'),
  shopName: z.string().min(1, 'Shop name is required'),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
  currencySymbol: z.string().default('₹'),
  receiptFooter: z.string().optional().default(''),
  modulePos: z.boolean(),
  moduleDevices: z.boolean(),
  moduleProducts: z.boolean(),
  moduleInventory: z.boolean(),
  moduleCategories: z.boolean(),
  moduleSales: z.boolean(),
  moduleBarcodes: z.boolean(),
  moduleReports: z.boolean(),
  moduleCustomers: z.boolean(),
  moduleSuppliers: z.boolean(),
  newPin: z.string().optional(),
  // Shopowner primary admin credentials setup
  ownerUsername: z.string().optional(),
  ownerFullName: z.string().optional(),
  ownerPassword: z.string().optional(),
});

// GET /api/partner/status - Returns active module flags & shop identity + current owner admin details
router.get('/status', async (req, res: Response) => {
  try {
    let settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: { id: 'default' },
      });
    }

    // Find current shop owner user
    const currentOwner = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { username: true, fullName: true, email: true },
    });

    // Never return the partnerPinHash
    const { partnerPinHash, ...safeConfig } = settings;
    return res.json({
      ...safeConfig,
      ownerUsername: currentOwner?.username || 'admin',
      ownerFullName: currentOwner?.fullName || 'Shop Owner',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch partner config' });
  }
});

// POST /api/partner/verify - Verify partner PIN
router.post('/verify', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'Master PIN required' });
    }

    const settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });
    let valid = false;

    if (settings?.partnerPinHash) {
      valid = await bcrypt.compare(pin, settings.partnerPinHash);
    } else {
      valid = pin === DEFAULT_PARTNER_PIN;
    }

    if (!valid) {
      return res.status(403).json({ error: 'Invalid Master Partner PIN' });
    }

    return res.json({ success: true, authorized: true, settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Verification error' });
  }
});

// PUT /api/partner/update - Update modules and shop identity (Strictly Partner only)
router.put('/update', authenticate, requirePartner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = partnerConfigSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { pin, newPin, ownerUsername, ownerFullName, ownerPassword, ...updateData } = parse.data;

    const currentSettings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });

    let finalPinHash = currentSettings?.partnerPinHash;
    if (newPin && newPin.trim().length >= 4) {
      finalPinHash = await bcrypt.hash(newPin.trim(), 10);
    }

    const updated = await prisma.shopSettings.upsert({
      where: { id: 'default' },
      update: {
        ...updateData,
        partnerPinHash: finalPinHash,
      },
      create: {
        id: 'default',
        ...updateData,
        partnerPinHash: finalPinHash,
      },
    });

    // If Partner set new shopowner admin credentials
    if (ownerUsername && ownerUsername.trim().length > 0) {
      const cleanUsername = ownerUsername.trim();
      const cleanFullName = (ownerFullName && ownerFullName.trim().length > 0) ? ownerFullName.trim() : 'Store Administrator';

      let passwordHash: string | undefined = undefined;
      if (ownerPassword && ownerPassword.trim().length > 0) {
        passwordHash = await bcrypt.hash(ownerPassword.trim(), 10);
      }

      // Check if admin user exists
      const existingOwner = await prisma.user.findFirst({
        where: {
          OR: [
            { username: cleanUsername },
            { role: 'ADMIN' },
          ],
        },
      });

      if (existingOwner) {
        await prisma.user.update({
          where: { id: existingOwner.id },
          data: {
            username: cleanUsername,
            fullName: cleanFullName,
            email: updateData.email || existingOwner.email,
            ...(passwordHash ? { passwordHash } : {}),
            role: 'ADMIN',
            isActive: true,
          },
        });
      } else {
        const initialHash = passwordHash || (await bcrypt.hash('admin123', 10));
        await prisma.user.create({
          data: {
            username: cleanUsername,
            fullName: cleanFullName,
            email: updateData.email || 'owner@shop.com',
            passwordHash: initialHash,
            role: 'ADMIN',
            isActive: true,
          },
        });
      }
    }

    await createAuditLog({
      userId: req.user?.id,
      action: 'PARTNER_CONFIG_UPDATE',
      entity: 'ShopSettings',
      entityId: 'default',
      details: `Partner updated shop branding and enabled modules: ${JSON.stringify(updateData)}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update partner configuration' });
  }
});

export default router;
