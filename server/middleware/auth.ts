import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'rephonix_pos_jwt_secure_super_secret_key_2026';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Verifies JWT token from Authorization header
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Check if user is still active in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, fullName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account is deactivated or not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Restricts access to ADMIN role only
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  next();
}

/**
 * Helper to record audit logs for critical operations
 */
export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
}: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Audit log recording failed:', err);
  }
}
