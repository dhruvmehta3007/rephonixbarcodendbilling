import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'CASHIER']).default('CASHIER'),
});

// GET /api/users - List all users (Admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { sales: true } },
      },
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = createUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { username, fullName, email, password, role } = parse.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        fullName,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: user.id,
      details: `Created user ${user.username} with role ${user.role}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// PUT /api/users/:id/toggle-status - Activate/Deactivate user
router.put('/:id/toggle-status', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !target.isActive },
    });

    return res.json({ success: true, user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to toggle status' });
  }
});

// GET /api/users/audit-logs - View Audit Trail
router.get('/audit-logs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '100' } = req.query;
    const logs = await prisma.auditLog.findMany({
      take: parseInt(limit as string, 10) || 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, username: true } },
      },
    });
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

export default router;
