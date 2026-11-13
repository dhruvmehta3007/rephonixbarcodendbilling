import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional().nullable(),
});

// GET /api/categories
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

// POST /api/categories
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { name, description } = parse.data;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: { name, slug, description },
    });

    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const { name, description } = parse.data;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const id = req.params.id as string;
    const updated = await prisma.category.update({
      where: { id },
      data: { name, slug, description },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const productsCount = await prisma.product.count({ where: { categoryId: id } });
    if (productsCount > 0) {
      return res.status(400).json({ error: `Cannot delete category: ${productsCount} products are assigned to it.` });
    }

    await prisma.category.delete({ where: { id } });
    return res.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete category' });
  }
});

export default router;
