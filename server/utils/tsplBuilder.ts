export interface TSPLItem {
  name: string;
  barcode: string;
  price?: number | string;
  quantity?: number;
}

export interface TSPLJobOptions {
  widthMM?: number;
  heightMM?: number;
  gapMM?: number;
  labelSize?: string;
}

/**
 * Generate a complete TSPL batch print job for CellPoint Barcode Labels.
 * Authoritative default: 50mm x 25mm (400x200 dots @ 203 DPI, 2:1 ratio).
 * Also supports 30mm x 15mm (240x120 dots).
 *
 * CRITICAL TSPL PROTOCOL:
 * Hardware setup (SIZE, GAP, SPEED, DENSITY, DIRECTION, REFERENCE, OFFSET) is defined ONCE
 * at the top of the job.
 * Each label gets its own CLS -> Layout -> PRINT 1,${qty} cycle.
 */
export function buildCellPointTSPLJob(
  items: TSPLItem[],
  options: TSPLJobOptions = {}
): string {
  const is30x15 = options.labelSize === '30x15' || options.widthMM === 30;
  const widthMM = is30x15 ? 30 : (options.widthMM || 50);
  const heightMM = is30x15 ? 15 : (options.heightMM || 25);
  const gap = options.gapMM ?? 3;

  // Global Hardware Header (Declared ONCE per print job)
  // DENSITY 8: Optimal thermal burn temperature. Eliminates thermal bleeding/blooming
  // so narrow spaces between bars remain crisp and instantly readable by handheld optical scanners.
  const commands: string[] = [
    `SIZE ${widthMM} mm, ${heightMM} mm`,
    `GAP ${gap} mm, 0 mm`,
    `SPEED 3`,
    `DENSITY 8`,
    `DIRECTION 1`,
    `REFERENCE 0,0`,
    `OFFSET 0 mm`,
  ];

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const cleanBarcode = (item.barcode || '000000').replace(/"/g, '').trim();

    let priceText = '';
    if (item.price !== undefined && item.price !== null && item.price !== '') {
      const numPrice = Number(item.price);
      if (!isNaN(numPrice)) {
        priceText = `Rs. ${Math.round(numPrice)}`;
      } else {
        priceText = `Rs. ${item.price}`;
      }
    }

    commands.push(`CLS`);

    if (is30x15) {
      // Compact 30x15 mm layout (240x120 dots @ 203 DPI)
      const cleanName = (item.name || 'PRODUCT').slice(0, 24).toUpperCase().replace(/"/g, '');
      const priceWidth = priceText.length * 8;
      const priceX = Math.max(120, 230 - priceWidth);

      // Centered: 14 chars in Font 1 (8x12) = 112 dots -> (240 - 112)/2 = 64
      commands.push(`TEXT 64,4,"1",0,1,1,"THE CELL POINT"`);
      commands.push(`TEXT 8,18,"1",0,1,1,"${cleanName}"`);
      // Code 128: narrow=2, wide=2 (1:1 ratio) with clean quiet zones
      commands.push(`BARCODE 8,34,"128",30,0,0,2,2,"${cleanBarcode}"`);
      const barcodeFont = cleanBarcode.length > 12 ? '1' : '1';
      commands.push(`TEXT 8,68,"${barcodeFont}",0,1,1,"${cleanBarcode.slice(0, 14)}"`);
      if (priceText) {
        commands.push(`TEXT ${priceX},68,"1",0,1,1,"${priceText}"`);
      }
    } else {
      // Authoritative 50x25 mm standard layout (400x200 dots @ 203 DPI)
      const cleanName = (item.name || 'PRODUCT').slice(0, 36).toUpperCase().replace(/"/g, '');
      const nameFont = cleanName.length > 22 ? '1' : '2';
      const nameY = cleanName.length > 22 ? 32 : 28;

      // Header: THE CELL POINT (Font 2 = 12x20 dots, 14 chars = 168 dots, centered at X=116, Y=8)
      commands.push(`TEXT 116,8,"2",0,1,1,"THE CELL POINT"`);

      // Product Name (2mm inset from edge to prevent mechanical clipping)
      commands.push(`TEXT 16,${nameY},"${nameFont}",0,1,1,"${cleanName}"`);

      // Barcode dimension & quiet zone calculation:
      const isPureDigits = /^\d+$/.test(cleanBarcode);
      const estimatedModules = isPureDigits
        ? Math.ceil(cleanBarcode.length / 2) * 11 + 35
        : cleanBarcode.length * 11 + 35;

      let narrow = 2;
      let barcodeWidth = estimatedModules * narrow;

      // Keep barcode strictly <= 360 dots to preserve at least 20 dots quiet zone on both sides
      if (barcodeWidth > 360) {
        narrow = 1;
        barcodeWidth = estimatedModules * 1;
      }

      // Centered X position with at least 16 dots (2mm) margin
      const startX = Math.max(16, Math.floor((400 - barcodeWidth) / 2));

      // Barcode: Code 128, Height=66 dots (~8.2mm), Y=52 to Y=118
      commands.push(`BARCODE ${startX},52,"128",66,0,0,${narrow},${narrow},"${cleanBarcode}"`);

      // Barcode text on left: capped to ensure it never encroaches on 6-digit price space
      // If barcode > 14 chars, switch to Font 1 (8 dots/char) to prevent overlapping price
      const barcodeFont = cleanBarcode.length > 14 ? '1' : '2';
      commands.push(`TEXT 16,128,"${barcodeFont}",0,1,1,"${cleanBarcode}"`);

      if (priceText) {
        // Price on right: guaranteed minimum space for 6+ digits (e.g. Rs. 150000 / Rs. 999999)
        // Font 3 is 16x24 dots bold. 10 chars = 160 dots.
        // Right-align from X=384, with minimum left boundary at X=190
        const priceWidth = priceText.length * 16;
        const priceX = Math.max(190, 384 - priceWidth);
        commands.push(`TEXT ${priceX},128,"3",0,1,1,"${priceText}"`);
      }
    }

    // Print label and advance exactly to the physical gap
    commands.push(`PRINT 1,${qty}`);
  }

  return commands.join('\r\n') + '\r\n';
}

/**
 * Single-item helper for backwards compatibility
 */
export function buildCellPointTSPL(
  item: TSPLItem & { gapMM?: number; widthMM?: number; heightMM?: number; labelSize?: string }
): string {
  return buildCellPointTSPLJob([item], {
    gapMM: item.gapMM,
    widthMM: item.widthMM,
    heightMM: item.heightMM,
    labelSize: item.labelSize,
  });
}
