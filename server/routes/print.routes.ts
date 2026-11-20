import { Router, Request, Response } from 'express';
import { printRawTSPL } from '../utils/rawPrinter';
import { buildCellPointTSPLJob } from '../utils/tsplBuilder';
import { prisma } from '../db';

const router = Router();

/**
 * Direct TSPL Hardware Print endpoint (Option 2)
 * Bypasses Chrome print dialog, margins, and spooler page limits entirely.
 */
router.post('/direct-tspl', async (req: Request, res: Response) => {
  try {
    const {
      items,
      printerName = '4BARCODE 4B-2054TG',
      gapMM = 3,
      labelSize = '50x25',
      widthMM = 50,
      heightMM = 25,
      shopName,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided to print' });
    }

    // Resolve shop name from payload or database
    let resolvedShopName = shopName;
    if (!resolvedShopName) {
      try {
        const settings = await prisma.shopSettings.findUnique({ where: { id: 'default' } });
        if (settings?.shopName) {
          resolvedShopName = settings.shopName;
        }
      } catch (e) {
        // Fallback to default
      }
    }

    const tsplJob = buildCellPointTSPLJob(
      items.map((item) => ({
        name: item.name,
        barcode: item.barcode,
        customValue: item.customValue || item.labelValue,
        price: item.price ?? item.sellingPrice,
        quantity: item.quantity || 1,
      })),
      {
        gapMM: Number(gapMM) || 3,
        labelSize,
        widthMM: Number(widthMM) || 50,
        heightMM: Number(heightMM) || 25,
        shopName: resolvedShopName || 'REPHONIX',
      }
    );

    const printResult = printRawTSPL(printerName, tsplJob);

    if (printResult.success) {
      return res.json({
        success: true,
        message: `Successfully printed ${items.length} label(s) directly to ${printerName}`,
        totalLabels: items.length,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: printResult.message,
      });
    }
  } catch (err: any) {
    console.error('Direct print error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while printing',
    });
  }
});

export default router;
