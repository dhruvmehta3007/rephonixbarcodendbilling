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
    console.log(`[AUTH LOGIN ATTEMPT] Received username: "${username}" (length: ${username.length}), password length: ${password.length}`);

    // Case-insensitive username lookup
    let user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
        },
      },
    });

    if (!user) {
      // Also try lowercase fallback
      user = await prisma.user.findFirst({
        where: {
          username: {
            equals: username.trim().toLowerCase(),
          },
        },
      });
    }

    if (!user || !user.isActive) {
      console.log(`[AUTH LOGIN FAILED] User not found or inactive for "${username}"`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password.trim(), user.passwordHash);
    console.log(`[AUTH LOGIN MATCH] User "${user.username}" bcrypt compare result:`, isValid);

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
