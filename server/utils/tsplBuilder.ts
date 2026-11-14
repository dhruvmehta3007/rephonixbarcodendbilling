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
      priceText = isNaN(numPrice) ? `Rs.${item.price}` : `Rs.${Math.round(numPrice)}`;
    }

    commands.push(`CLS`);

    if (is30x15) {
      // Compact 30x15 mm layout (240x120 dots @ 203 DPI)
      const cleanName = (item.name || 'PRODUCT').slice(0, 24).toUpperCase().replace(/"/g, '');
      const priceWidth = priceText.length * 8;
      const priceX = Math.max(120, 228 - priceWidth);

      commands.push(`TEXT 80,4,"1",0,1,1,"CELL POINT"`);
      commands.push(`TEXT 12,18,"1",0,1,1,"${cleanName}"`);
      // Code 128: narrow=2, wide=2 (1:1 ratio) with clean quiet zones
      commands.push(`BARCODE 16,34,"128",30,0,0,2,2,"${cleanBarcode}"`);
      commands.push(`TEXT 12,72,"1",0,1,1,"${cleanBarcode}"`);
      if (priceText) {
        commands.push(`TEXT ${priceX},72,"1",0,1,1,"${priceText}"`);
      }
    } else {
      // Authoritative 50x25 mm standard layout (400x200 dots @ 203 DPI)
      const cleanName = (item.name || 'PRODUCT').slice(0, 36).toUpperCase().replace(/"/g, '');
      const nameFont = cleanName.length > 22 ? '1' : '2';
      const nameY = cleanName.length > 22 ? 36 : 32;

      // Header: CELL POINT (Font 2 = 12x20 dots, 10 chars = 120 dots, centered at X=140, Y=8)
      commands.push(`TEXT 140,8,"2",0,1,1,"CELL POINT"`);

      // Product Name
      commands.push(`TEXT 16,${nameY},"${nameFont}",0,1,1,"${cleanName}"`);

      // Barcode dimension & quiet zone calculation:
      // Code 128 has 11 modules per char + 35 overhead modules (start, check, stop, term).
      // If pure digits, Code 128 compresses pairs into 1 character in Subset C.
      const isPureDigits = /^\d+$/.test(cleanBarcode);
      const estimatedModules = isPureDigits
        ? Math.ceil(cleanBarcode.length / 2) * 11 + 35
        : cleanBarcode.length * 11 + 35;

      let narrow = 2;
      let barcodeWidth = estimatedModules * narrow;

      // Keep barcode strictly <= 340 dots to guarantee at least 30 dots (3.75mm) of pure white quiet zone
      if (barcodeWidth > 340) {
        narrow = 1;
        barcodeWidth = estimatedModules * 1;
      }

      // Centered X position with at least 20 dots minimum margin
      const startX = Math.max(20, Math.floor((400 - barcodeWidth) / 2));

      // Barcode: Code 128, Height=72 dots (~9mm), narrow=wide (strictly 1:1 for Code 128)
      // No horizontal divider bars around barcode to prevent laser clipping when scanning at an angle!
      commands.push(`BARCODE ${startX},56,"128",72,0,0,${narrow},${narrow},"${cleanBarcode}"`);

      // Footer: Barcode text on left (Font 2 = 12x20 dots)
      commands.push(`TEXT 16,146,"2",0,1,1,"${cleanBarcode}"`);

      if (priceText) {
        // Price on right (Font 3 = 16x24 dots bold)
        const priceWidth = priceText.length * 16;
        const priceX = Math.max(180, 384 - priceWidth);
        commands.push(`TEXT ${priceX},144,"3",0,1,1,"${priceText}"`);
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
