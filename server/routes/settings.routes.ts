import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';
import { resetToCleanDatabase } from '../reset-clean-db';

const router = Router();

const clientSettingsSchema = z.object({
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

// PUT /api/settings - Shop Owner can only edit phone, email, tax & policy (Shop Name & Address are locked to Partner Portal)
router.put('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = clientSettingsSchema.safeParse(req.body);
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

// POST /api/settings/reset-database (Admin-only fallback/clean database option)
router.post('/reset-database', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await resetToCleanDatabase();

    await createAuditLog({
      userId: req.user?.id,
      action: 'SETTINGS_UPDATE',
      entity: 'Database',
      entityId: 'clean-reset',
      details: 'Administrator reset the database to pure clean state',
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Database successfully purged and reset to pristine clean state.',
      ...result,
    });
  } catch (error: any) {
    console.error('Reset database failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset database' });
  }
});

export default router;
