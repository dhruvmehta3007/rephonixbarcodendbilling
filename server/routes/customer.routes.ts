import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
});

// GET /api/customers
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { totalSpent: 'desc' },
      include: {
        _count: { select: { sales: true } },
      },
    });

    return res.json(customers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch customer' });
  }
});

// POST /api/customers
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = customerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { name, phone, email, address } = parse.data;

    if (phone) {
      const existing = await prisma.customer.findUnique({ where: { phone } });
      if (existing) {
        return res.status(400).json({ error: `Customer with phone ${phone} already exists` });
      }
    }

    const customer = await prisma.customer.create({
      data: { name, phone, email, address },
    });

    return res.status(201).json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parse = customerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: parse.data,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update customer' });
  }
});

export default router;
