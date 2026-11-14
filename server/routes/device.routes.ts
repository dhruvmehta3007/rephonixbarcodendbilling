import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireAdmin, AuthenticatedRequest, createAuditLog } from '../middleware/auth';
import { generateUniqueBarcode } from '../utils/barcode';

const router = Router();

// Validation schema for creating a tracked device unit
const deviceSchema = z.object({
  deviceName: z.string().optional().nullable(), // Allow typing device name directly or picking from catalog
  productId: z.string().optional().nullable(),
  barcode: z.string().min(1, 'EAN / Barcode is required'),
  imei1: z.string().optional().nullable(),
  imei2: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  condition: z.enum(['NEW', 'OPEN_BOX', 'REFURBISHED', 'PRE_OWNED']).default('NEW'),
  status: z.enum(['IN_STOCK', 'RESERVED', 'SOLD', 'RETURNED', 'REPAIR']).default('IN_STOCK'),
  purchasePrice: z.number().min(0, 'Bought price cannot be negative'),
  sellingPrice: z.number().optional().nullable(),
  customValue: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(), // Direct vendor name
  supplierId: z.string().optional().nullable(),
  purchaseInvoiceNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/devices/lookup - Instant barcode / IMEI / serial lookup
router.get('/lookup', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Search code or barcode is required' });
    }

    // Parse potential serialized suffix (e.g., 'CPB8240626735-02' -> base 'CPB8240626735', piece '02')
    let baseCode = code;
    let pieceNumber: number | null = null;
    const pieceMatch = code.match(/^(.*?)[-_/ ]+(\d+)$/);
    if (pieceMatch) {
      baseCode = pieceMatch[1];
      pieceNumber = parseInt(pieceMatch[2], 10);
    }

    // 1. Try exact match on DeviceUnit
    let device = await prisma.deviceUnit.findFirst({
      where: {
        OR: [
          { barcode: code },
          { imei1: code },
          { imei2: code },
          { serialNumber: code },
        ],
      },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        supplier: true,
        saleItem: {
          include: {
            sale: {
              include: {
                customer: true,
                cashier: { select: { id: true, fullName: true, username: true } },
              },
            },
          },
        },
      },
    });

    // 2. If not found and code was serialized, try base code on DeviceUnit
    if (!device && pieceMatch) {
      device = await prisma.deviceUnit.findFirst({
        where: {
          OR: [
            { barcode: baseCode },
            { imei1: baseCode },
            { imei2: baseCode },
            { serialNumber: baseCode },
          ],
        },
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
          supplier: true,
          saleItem: {
            include: {
              sale: {
                include: {
                  customer: true,
                  cashier: { select: { id: true, fullName: true, username: true } },
                },
              },
            },
          },
        },
      });
    }

    if (device) {
      return res.json({
        type: 'DEVICE_UNIT',
        data: {
          ...device,
          scannedBarcode: code,
          baseBarcode: baseCode,
          pieceNumber: pieceNumber || undefined,
          isSerializedPiece: Boolean(pieceNumber && code !== baseCode),
        },
      });
    }

    // 3. Try exact match on Catalog Product
    let product = await prisma.product.findFirst({
      where: {
        isArchived: false,
        barcode: code,
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: true,
        devices: {
          take: 10,
          orderBy: { purchaseDate: 'desc' },
          include: { supplier: true },
        },
      },
    });

    // 4. If not found and code was serialized, try base code on Catalog Product
    if (!product && pieceMatch) {
      product = await prisma.product.findFirst({
        where: {
          isArchived: false,
          barcode: baseCode,
        },
        include: {
          category: { select: { id: true, name: true } },
          supplier: true,
          devices: {
            take: 10,
            orderBy: { purchaseDate: 'desc' },
            include: { supplier: true },
          },
        },
      });
    }

    if (product) {
      return res.json({
        type: 'PRODUCT_CATALOG',
        data: {
          ...product,
          scannedBarcode: code,
          baseBarcode: baseCode,
          pieceNumber: pieceNumber || undefined,
          isSerializedPiece: Boolean(pieceNumber && code !== baseCode),
        },
      });
    }

    return res.status(404).json({ error: `No device or product found for barcode: "${code}"` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error looking up barcode' });
  }
});

// GET /api/devices - List devices with filtering and pagination
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      search, 
      status, 
      productId, 
      supplierId, 
      condition, 
      page = '1', 
      limit = '50',
      sortBy = 'purchaseDate',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { barcode: { contains: q } },
        { imei1: { contains: q } },
        { imei2: { contains: q } },
        { serialNumber: { contains: q } },
        { purchaseInvoiceNo: { contains: q } },
        { product: { name: { contains: q } } },
      ];
    }

    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }

    if (condition && typeof condition === 'string' && condition !== 'all') {
      where.condition = condition;
    }

    if (productId && typeof productId === 'string' && productId !== 'all') {
      where.productId = productId;
    }

    if (supplierId && typeof supplierId === 'string' && supplierId !== 'all') {
      where.supplierId = supplierId;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;

    const [devices, total] = await Promise.all([
      prisma.deviceUnit.findMany({
        where,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        include: {
          product: {
            select: { id: true, name: true, barcode: true, sellingPrice: true, customValue: true, category: { select: { name: true } } },
          },
          supplier: {
            select: { id: true, name: true, phone: true },
          },
        },
      }),
      prisma.deviceUnit.count({ where }),
    ]);

    return res.json({
      data: devices,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch devices' });
  }
});

// POST /api/devices - Register new device unit
router.post('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = deviceSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0].message });
    }

    const data = parse.data;

    // Clean up duplicated barcode logic
    let barcode = data.barcode?.trim();
    if (!barcode) {
      if (data.imei1?.trim()) {
        barcode = data.imei1.trim();
      } else if (data.serialNumber?.trim()) {
        barcode = data.serialNumber.trim();
      } else {
        barcode = await generateUniqueBarcode('DEV', 'device');
      }
    }

    // Duplicate check
    const existingBarcode = await prisma.deviceUnit.findUnique({ where: { barcode } });
    if (existingBarcode) {
      return res.status(400).json({ error: `A device with barcode "${barcode}" already exists.` });
    }

    if (data.imei1) {
      const existingImei = await prisma.deviceUnit.findUnique({ where: { imei1: data.imei1.trim() } });
      if (existingImei) {
        return res.status(400).json({ error: `A device with IMEI "${data.imei1}" already exists.` });
      }
    }

    if (data.serialNumber) {
      const existingSerial = await prisma.deviceUnit.findUnique({ where: { serialNumber: data.serialNumber.trim() } });
      if (existingSerial) {
        return res.status(400).json({ error: `A device with Serial "${data.serialNumber}" already exists.` });
      }
    }

    let targetProductId = data.productId;

    // If direct deviceName was provided without selecting a catalog product, find or create the base product
    if (!targetProductId && data.deviceName?.trim()) {
      const name = data.deviceName.trim();
      let prod = await prisma.product.findFirst({
        where: { name, isArchived: false },
      });
      if (!prod) {
        // Use the device's actual barcode as the product barcode, or fallback to EAN/timestamp
        const baseBarcode = data.barcode?.trim() || `${Date.now()}`;
        prod = await prisma.product.create({
          data: {
            name,
            barcode: baseBarcode,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : 0.0,
            customValue: data.customValue?.trim() || null,
            taxRate: 0.0,
            currentStock: 0,
            minStockThreshold: 1,
            unit: 'pcs',
          },
        });
      } else {
        const updateData: any = {};
        if (data.sellingPrice !== undefined && Number(data.sellingPrice) > 0) {
          updateData.sellingPrice = Number(data.sellingPrice);
        }
        if (data.customValue !== undefined) {
          updateData.customValue = data.customValue?.trim() || null;
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.product.update({
            where: { id: prod.id },
            data: updateData,
          });
        }
      }
      targetProductId = prod.id;
    }

    if (!targetProductId) {
      return res.status(400).json({ error: 'Device name or model is required' });
    }

    // If direct vendorName was entered, find or create supplier
    let targetSupplierId = data.supplierId;
    if (!targetSupplierId && data.vendorName?.trim()) {
      const vName = data.vendorName.trim();
      let sup = await prisma.supplier.findFirst({ where: { name: vName } });
      if (!sup) {
        sup = await prisma.supplier.create({ data: { name: vName } });
      }
      targetSupplierId = sup.id;
    }

    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();

    // Create individual device with its own distinct barcode
    const newDevice = await prisma.$transaction(async (tx) => {
      const device = await tx.deviceUnit.create({
        data: {
          productId: targetProductId,
          imei1: data.imei1?.trim() || null,
          imei2: data.imei2?.trim() || null,
          serialNumber: data.serialNumber?.trim() || null,
          barcode,
          color: data.color?.trim() || null,
          storage: data.storage?.trim() || null,
          condition: data.condition,
          status: data.status,
          purchasePrice: data.purchasePrice,
          customValue: data.customValue?.trim() || null,
          purchaseDate,
          supplierId: targetSupplierId || null,
          purchaseInvoiceNo: data.purchaseInvoiceNo?.trim() || null,
          notes: data.notes?.trim() || null,
        },
        include: {
          product: true,
          supplier: true,
        },
      });

      // Update product inventory stock by exactly +1 for this unique device
      if (data.status === 'IN_STOCK') {
        const prod = await tx.product.findUnique({ where: { id: targetProductId } });
        if (prod) {
          await tx.product.update({
            where: { id: targetProductId },
            data: { 
              currentStock: prod.currentStock + 1,
              purchasePrice: data.purchasePrice, // update latest bought price
            },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: targetProductId,
              type: 'PURCHASE',
              quantityChange: 1,
              stockBefore: prod.currentStock,
              stockAfter: prod.currentStock + 1,
              reason: `Individual device unit added (Barcode/EAN: ${barcode})`,
              userId: req.user?.id,
            },
          });
        }
      }

      return device;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DEVICE_CREATE',
      entity: 'DeviceUnit',
      entityId: newDevice.id,
      details: `Registered device unit: ${newDevice.product?.name} (Barcode: ${newDevice.barcode}, Buy Price: ${newDevice.purchasePrice})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(newDevice);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to register device' });
  }
});

// PUT /api/devices/:id - Update device details
router.put('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const device = await prisma.deviceUnit.findUnique({ where: { id } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const {
      color,
      storage,
      condition,
      status,
      purchasePrice,
      purchaseDate,
      supplierId,
      purchaseInvoiceNo,
      notes,
    } = req.body;

    const updated = await prisma.deviceUnit.update({
      where: { id },
      data: {
        ...(color !== undefined && { color }),
        ...(storage !== undefined && { storage }),
        ...(condition !== undefined && { condition }),
        ...(status !== undefined && { status }),
        ...(purchasePrice !== undefined && { purchasePrice: Number(purchasePrice) }),
        ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(purchaseInvoiceNo !== undefined && { purchaseInvoiceNo }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        product: true,
        supplier: true,
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update device' });
  }
});

// PUT /api/devices/:id/mark-sold - Mark device as sold with optional sale price & customer
router.put('/:id/mark-sold', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { soldPrice = 0, notes } = req.body;

    const device = await prisma.deviceUnit.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.status === 'SOLD') {
      return res.status(400).json({ error: 'This device is already marked as SOLD.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark device as SOLD
      const resDev = await tx.deviceUnit.update({
        where: { id },
        data: {
          status: 'SOLD',
          soldPrice: soldPrice ? parseFloat(soldPrice) : null,
          soldAt: new Date(),
          notes: notes ? `${device.notes ? device.notes + ' | ' : ''}${notes}` : device.notes,
        },
        include: { product: true, supplier: true },
      });

      // 2. Decrement product stock by 1
      const prod = await tx.product.findUnique({ where: { id: device.productId } });
      if (prod && prod.currentStock > 0) {
        await tx.product.update({
          where: { id: device.productId },
          data: { currentStock: prod.currentStock - 1 },
        });

        // 3. Record SALE inventory movement
        await tx.inventoryMovement.create({
          data: {
            productId: device.productId,
            type: 'SALE',
            quantityChange: -1,
            stockBefore: prod.currentStock,
            stockAfter: prod.currentStock - 1,
            reason: `Direct sale: Device Unit (Barcode: ${device.barcode}) sold for ₹${soldPrice || 'N/A'}`,
            userId: req.user?.id,
          },
        });
      }

      return resDev;
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DEVICE_MARK_SOLD',
      entity: 'DeviceUnit',
      entityId: id,
      details: `Marked device "${device.product?.name}" (Barcode: ${device.barcode}) as SOLD for ₹${soldPrice}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to mark device as sold' });
  }
});

// DELETE /api/devices/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const device = await prisma.deviceUnit.findUnique({ where: { id } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.status === 'SOLD') {
      return res.status(400).json({ error: 'Cannot delete a device that has already been sold.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.deviceUnit.delete({ where: { id } });

      if (device.status === 'IN_STOCK') {
        const prod = await tx.product.findUnique({ where: { id: device.productId } });
        if (prod && prod.currentStock > 0) {
          await tx.product.update({
            where: { id: device.productId },
            data: { currentStock: prod.currentStock - 1 },
          });
        }
      }
    });

    return res.json({ success: true, message: 'Device deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete device' });
  }
});

export default router;

