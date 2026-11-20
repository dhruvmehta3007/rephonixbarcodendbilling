export interface TSPLItem {
  name: string;
  barcode: string;
  customValue?: string;
  labelValue?: string;
  price?: number | string;
  quantity?: number;
}

export interface TSPLJobOptions {
  widthMM?: number;
  heightMM?: number;
  gapMM?: number;
  labelSize?: string;
  shopName?: string;
}

/**
 * Generate a complete TSPL batch print job for CellPoint Barcode Labels.
 * Authoritative default: 50mm x 25mm (400x200 dots @ 203 DPI, 2:1 ratio).
 * Also supports 30mm x 15mm (240x120 dots).
 */
export function buildCellPointTSPLJob(
  items: TSPLItem[],
  options: TSPLJobOptions = {}
): string {
  const is30x15 = options.labelSize === '30x15' || options.widthMM === 30;
  const widthMM = is30x15 ? 30 : (options.widthMM || 50);
  const heightMM = is30x15 ? 15 : (options.heightMM || 25);
  const gap = options.gapMM ?? 3;
  const brandTitle = (options.shopName || 'REPHONIX').trim().toUpperCase().replace(/"/g, '');

  // Global Hardware Header (Declared ONCE per print job)
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
        priceText = `Rs. ${Math.round(numPrice).toLocaleString('en-IN')}`;
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

      // Centered: Header text
      const headerWidth = brandTitle.length * 8;
      const headerX = Math.max(8, Math.floor((240 - headerWidth) / 2));
      commands.push(`TEXT ${headerX},10,"1",0,1,1,"${brandTitle}"`);
      const nameWidth = cleanName.length * 8;
      const nameX = Math.max(8, Math.floor((240 - nameWidth) / 2));
      commands.push(`TEXT ${nameX},26,"1",0,1,1,"${cleanName}"`);
      // Code 128: narrow=2, wide=2 (1:1 ratio) with clean quiet zones (encodes IMEI barcode)
      commands.push(`BARCODE 8,42,"128",28,0,0,2,2,"${cleanBarcode}"`);
      const labelText = (item.customValue || item.labelValue || cleanBarcode).replace(/"/g, '').trim();
      const barcodeFont = labelText.length > 12 ? '1' : '1';
      commands.push(`TEXT 8,78,"${barcodeFont}",0,1,1,"${labelText.slice(0, 14)}"`);
      if (priceText) {
        commands.push(`TEXT ${priceX},78,"1",0,1,1,"${priceText}"`);
      }
    } else {
      // Authoritative 50x25 mm standard layout (400x200 dots @ 203 DPI)
      const cleanName = (item.name || 'PRODUCT').slice(0, 36).toUpperCase().replace(/"/g, '');
      const nameFont = cleanName.length > 22 ? '1' : '2';

      // Header in Font 3 (16x24 dots per char)
      const headerFont = brandTitle.length > 14 ? '2' : '3';
      const charWidth = headerFont === '3' ? 16 : 12;
      const totalHeaderWidth = brandTitle.length * charWidth;
      const headerX = Math.max(8, Math.floor((400 - totalHeaderWidth) / 2));
      commands.push(`TEXT ${headerX},10,"${headerFont}",0,1,1,"${brandTitle}"`);

      // Product Name: Configured at X=88, Y=38
      const nameY = nameFont === '2' ? 38 : 40;
      commands.push(`TEXT 88,${nameY},"${nameFont}",0,1,1,"${cleanName}"`);

      // Barcode dimension & module calculation:
      const isPureDigits = /^\d+$/.test(cleanBarcode);
      const estimatedModules = isPureDigits
        ? Math.ceil(cleanBarcode.length / 2) * 11 + 25
        : cleanBarcode.length * 11 + 35;

      let narrow = 2;
      let barcodeWidth = estimatedModules * narrow;

      // Keep barcode strictly <= 360 dots to preserve quiet zone on right side
      if (barcodeWidth > 360) {
        narrow = 1;
        barcodeWidth = estimatedModules * 1;
      }

      // Barcode: Code 128, height=84 dots (~10.5mm), Y=60 to Y=144 at X=65
      // Leaves a clean 14-dot (~1.75mm) gap before bottom row
      commands.push(`BARCODE 65,60,"128",84,0,0,${narrow},${narrow},"${cleanBarcode}"`);

      // Printed label text on left: Print label value (customValue) if provided, otherwise IMEI barcode
      // Positioned at X=24 with clean gap after barcode
      const labelText = (item.customValue || item.labelValue || cleanBarcode).replace(/"/g, '').trim();
      const isLongText = labelText.length > 10;
      const textFont = isLongText ? '1' : '2';
      const textY = isLongText ? 162 : 160;
      commands.push(`TEXT 24,${textY},"${textFont}",0,1,1,"${labelText}"`);

      if (priceText) {
        // Price on right: guaranteed minimum space for 6+ digits (e.g. Rs. 1,50,000 / Rs. 9,99,999)
        // Font 3 is 16x24 dots bold. Y=158 ends at Y=182, leaving comfortable bottom margin
        // Right-align from X=384 (leaving matching 16 dots / 2mm margin on right)
        const priceWidth = priceText.length * 16;
        const priceX = Math.max(180, 384 - priceWidth);
        commands.push(`TEXT ${priceX},158,"3",0,1,1,"${priceText}"`);
      }
    }

    // Print label and advance
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
