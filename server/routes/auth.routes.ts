import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest, createAuditLog } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rephonix_pos_jwt_secure_super_secret_key_2026';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { username, password } = parse.data;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: `User ${user.username} logged in successfully`,
      ipAddress: req.ip,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    await createAuditLog({
      userId: req.user.id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: req.user.id,
      details: `User ${req.user.username} logged out`,
      ipAddress: req.ip,
    });
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
