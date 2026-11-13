import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

const settingsSchema = z.object({
  shopName: z.string().min(2, 'Shop name is required'),
  address: z.string().min(2, 'Shop address is required'),
  phone: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  gstin: z.string().optional().default(''),
  currencySymbol: z.string().default('₹'),
  taxRateDefault: z.number().min(0).max(100).default(18),
  receiptFooter: z.string().default('Thank you for shopping!'),
  allowNegativeStock: z.boolean().default(false),
});

// GET /api/settings
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: { id: 'default' },
      });
    }
    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// PUT /api/settings
router.put('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = settingsSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const updated = await prisma.shopSettings.upsert({
      where: { id: 'default' },
      update: parse.data,
      create: { id: 'default', ...parse.data },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'SETTINGS_UPDATE',
      entity: 'ShopSettings',
      entityId: 'default',
      details: `Updated shop configuration (${updated.shopName})`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

export default router;
