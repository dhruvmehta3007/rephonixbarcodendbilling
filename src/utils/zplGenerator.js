import { PRINTER_CONFIG, DOTS_PER_MM } from '../constants/printerConfig';

/**
 * ZPL II (Zebra Programming Language) Machine Code Generator
 * Converts canvas label elements to native Zebra thermal printer commands.
 * Calibrated for 203 DPI (40mm x 20mm, 320x160 dots landscape)
 */

export function generateZPL(label = {}, elements = [], options = {}) {
  const dpi = options.dpi || label.dpi || PRINTER_CONFIG.dpi;
  const dpmm = DOTS_PER_MM || (dpi / 25.4); // 8 dots per mm for 203 DPI

  const mmToDots = (mm) => Math.round((Number(mm) || 0) * dpmm);

  const labelWidthDots = Number(label.widthDots) || (label.width ? mmToDots(label.width) : PRINTER_CONFIG.widthDots);
  const labelHeightDots = Number(label.heightDots) || (label.height ? mmToDots(label.height) : PRINTER_CONFIG.heightDots);

  const commands = [
    `^XA`, // Start of Format
    `^PW${labelWidthDots}`, // Print Width
    `^LL${labelHeightDots}`, // Label Length
    `^LH0,0`, // Label Home coordinates
    `^CI28`, // UTF-8 Encoding
  ];

  // Process elements in order
  for (const el of elements) {
    if (el.visible === false) continue;

    const x = mmToDots(el.x);
    const y = mmToDots(el.y);
    const w = mmToDots(el.width);
    const h = mmToDots(el.height);

    if (el.type === 'text') {
      // Font size estimation in dots
      const fontHeight = Math.max(12, Math.round(el.fontSize * (dpi / 72)));
      const fontWidth = Math.round(fontHeight * 0.8);
      const text = String(el.content || '').replace(/\^/g, '').replace(/~/g, '');

      commands.push(
        `^FO${x},${y}^A0N,${fontHeight},${fontWidth}^FD${text}^FS`
      );
    } else if (el.type === 'barcode') {
      const symbology = el.symbology || 'code128';
      const val = String(el.content || '12345').replace(/\^/g, '');
      const showText = el.showText ? 'Y' : 'N';
      const barHeight = Math.max(20, h - (el.showText ? 20 : 0));

      if (symbology === 'code128') {
        commands.push(`^FO${x},${y}^BCN,${barHeight},${showText},N,N^FD${val}^FS`);
      } else if (symbology === 'ean13') {
        commands.push(`^FO${x},${y}^BEN,${barHeight},${showText},N^FD${val}^FS`);
      } else if (symbology === 'code39') {
        commands.push(`^FO${x},${y}^B3N,N,${barHeight},${showText},N^FD${val}^FS`);
      } else if (symbology === 'upca') {
        commands.push(`^FO${x},${y}^BUN,${barHeight},${showText},N,Y^FD${val}^FS`);
      } else {
        commands.push(`^FO${x},${y}^BCN,${barHeight},${showText},N,N^FD${val}^FS`);
      }
    } else if (el.type === 'qrcode') {
      const val = String(el.content || 'https://rephonix.in');
      const mag = Math.max(2, Math.min(10, Math.round(w / 30)));
      commands.push(`^FO${x},${y}^BQN,2,${mag}^FDLA,${val}^FS`);
    } else if (el.type === 'datamatrix') {
      const val = String(el.content || '12345');
      const mag = Math.max(3, Math.min(10, Math.round(w / 25)));
      commands.push(`^FO${x},${y}^BXN,${mag},200^FD${val}^FS`);
    } else if (el.type === 'rect') {
      const borderDots = Math.max(1, mmToDots(el.borderWidth || 0.5));
      const radius = el.borderRadius ? Math.min(8, Math.round(el.borderRadius * 0.8)) : 0;
      commands.push(`^FO${x},${y}^GB${w},${h},${borderDots},B,${radius}^FS`);
    } else if (el.type === 'line') {
      const thick = Math.max(1, mmToDots(el.borderWidth || 0.5));
      commands.push(`^FO${x},${y}^GB${w},${thick},${thick}^FS`);
    } else if (el.type === 'badge') {
      const radius = 3;
      const thick = Math.max(1, mmToDots(el.borderWidth || 0.8));
      commands.push(`^FO${x},${y}^GB${w},${h},${thick},B,${radius}^FS`);
      const fontH = Math.max(10, Math.round(h * 0.5));
      const fontW = Math.round(fontH * 0.75);
      const textX = x + Math.round(w * 0.1);
      const textY = y + Math.round((h - fontH) / 2);
      commands.push(`^FO${textX},${textY}^A0N,${fontH},${fontW}^FD${el.content}^FS`);
    }
  }

  // Print quantity & End format
  const quantity = options.quantity || 1;
  commands.push(`^PQ${quantity}`);
  commands.push(`^XZ`);

  return commands.join('\n');
}
