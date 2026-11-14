import { PRINTER_CONFIG, DOTS_PER_MM } from '../constants/printerConfig';

/**
 * TSPL / TSPL2 (TSC / TVS / Xprinter / Godex Programming Language)
 * Machine code generator for direct thermal printing.
 * Calibrated for 203 DPI (40mm x 20mm, 320x160 dots landscape)
 */

export function generateTSPL(label = {}, elements = [], options = {}) {
  const dpi = options.dpi || label.dpi || PRINTER_CONFIG.dpi;
  const dpmm = DOTS_PER_MM || (dpi / 25.4); // 8 dots per mm for 203 DPI

  const mmToDots = (mm) => Math.round((Number(mm) || 0) * dpmm);

  const w_mm = Number(label.width) || PRINTER_CONFIG.widthMM;
  const h_mm = Number(label.height) || PRINTER_CONFIG.heightMM;

  const commands = [
    `SIZE ${w_mm} mm, ${h_mm} mm`,
    `GAP 2 mm, 0 mm`,
    `SPEED 4`,
    `DENSITY 8`,
    `DIRECTION 1`,
    `REFERENCE 0,0`,
    `OFFSET 0 mm`,
    `CLS`,
  ];

  for (const el of elements) {
    if (el.visible === false) continue;

    const x = mmToDots(el.x);
    const y = mmToDots(el.y);
    const w = mmToDots(el.width);
    const h = mmToDots(el.height);

    if (el.type === 'text') {
      const font = 'TSS24.BF2';
      const cleanText = String(el.content || '').replace(/"/g, '\\"');
      commands.push(`TEXT ${x},${y},"${font}",0,1,1,"${cleanText}"`);
    } else if (el.type === 'barcode') {
      const symbology = (el.symbology === 'ean13') ? 'EAN13' : '128';
      const showText = el.showText ? 1 : 0;
      const barH = Math.max(20, h - (el.showText ? 20 : 0));
      commands.push(
        `BARCODE ${x},${y},"${symbology}",${barH},${showText},0,2,2,"${el.content || '12345'}"`
      );
    } else if (el.type === 'qrcode') {
      const cellWidth = Math.max(2, Math.min(8, Math.round(w / 35)));
      commands.push(
        `QRCODE ${x},${y},L,${cellWidth},A,0,"${el.content || 'https://rephonix.in'}"`
      );
    } else if (el.type === 'datamatrix') {
      commands.push(
        `DMATRIX ${x},${y},${w},${h},"${el.content || '12345'}"`
      );
    } else if (el.type === 'rect') {
      const x2 = x + w;
      const y2 = y + h;
      const thick = Math.max(1, mmToDots(el.borderWidth || 0.5));
      commands.push(`BOX ${x},${y},${x2},${y2},${thick}`);
    } else if (el.type === 'line') {
      const thick = Math.max(1, mmToDots(el.borderWidth || 0.5));
      commands.push(`BAR ${x},${y},${w},${thick}`);
    } else if (el.type === 'badge') {
      const x2 = x + w;
      const y2 = y + h;
      const thick = Math.max(1, mmToDots(el.borderWidth || 0.8));
      commands.push(`BOX ${x},${y},${x2},${y2},${thick}`);
      commands.push(`TEXT ${x + 8},${y + 4},"TSS24.BF2",0,1,1,"${el.content}"`);
    }
  }

  const copies = options.quantity || 1;
  commands.push(`PRINT 1,${copies}`);

  return commands.join('\n');
}
