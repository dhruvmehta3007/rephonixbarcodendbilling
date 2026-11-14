/**
 * Confirmed Printer Specifications for CellPoint Barcode System
 * 203 DPI Direct Thermal Roll (50mm x 25mm, 400x200 dots landscape)
 */
export const PRINTER_CONFIG = {
  dpi: 203,
  widthMM: 50,
  heightMM: 25,
  widthDots: 400,
  heightDots: 200,
  orientation: "landscape"
};

// Dots per millimeter ratio: 400 dots / 50 mm = 8 dots/mm (203.2 DPI)
export const DOTS_PER_MM = PRINTER_CONFIG.widthDots / PRINTER_CONFIG.widthMM; // 8.0

/**
 * Convert millimeters to integer printer dots
 */
export function mmToDots(mm) {
  return Math.round((Number(mm) || 0) * DOTS_PER_MM);
}

/**
 * Convert printer dots to millimeters
 */
export function dotsToMm(dots) {
  return Number(((Number(dots) || 0) / DOTS_PER_MM).toFixed(2));
}

/**
 * Clamps coordinates and dimensions so elements remain inside the 400 x 200 dot boundary
 */
export function clampToBoundary(x, y, width, height, maxDotsW = PRINTER_CONFIG.widthDots, maxDotsH = PRINTER_CONFIG.heightDots) {
  const clampedW = Math.max(1, Math.min(width, maxDotsW));
  const clampedH = Math.max(1, Math.min(height, maxDotsH));
  const clampedX = Math.max(0, Math.min(x, maxDotsW - clampedW));
  const clampedY = Math.max(0, Math.min(y, maxDotsH - clampedH));
  return { x: clampedX, y: clampedY, width: clampedW, height: clampedH };
}

/**
 * Validate that an element in mm fits within label mm dimensions (50x25 mm / 400x200 dots)
 */
export function clampElementMm(el, labelWidth = PRINTER_CONFIG.widthMM, labelHeight = PRINTER_CONFIG.heightMM) {
  const w = Math.max(1, Math.min(Number(el.width) || 1, labelWidth));
  const h = Math.max(1, Math.min(Number(el.height) || 1, labelHeight));
  const x = Math.max(0, Math.min(Number(el.x) || 0, labelWidth - w));
  const y = Math.max(0, Math.min(Number(el.y) || 0, labelHeight - h));
  return {
    ...el,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(w.toFixed(2)),
    height: Number(h.toFixed(2)),
  };
}
