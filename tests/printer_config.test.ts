import { describe, it, expect } from 'vitest';
import { PRINTER_CONFIG, DOTS_PER_MM, mmToDots, dotsToMm, clampToBoundary, clampElementMm } from '../src/constants/printerConfig';
import { generateBarcodeSvg } from '../src/utils/barcodeGenerator';

describe('Confirmed Printer Specifications (203 DPI, 50x25 mm, 400x200 Dots)', () => {
  it('should match the exact authoritative PRINTER_CONFIG', () => {
    expect(PRINTER_CONFIG).toEqual({
      dpi: 203,
      widthMM: 50,
      heightMM: 25,
      widthDots: 400,
      heightDots: 200,
      orientation: 'landscape',
    });
  });

  it('should maintain an exact 2:1 aspect ratio', () => {
    const dotsRatio = PRINTER_CONFIG.widthDots / PRINTER_CONFIG.heightDots;
    const mmRatio = PRINTER_CONFIG.widthMM / PRINTER_CONFIG.heightMM;
    expect(dotsRatio).toBe(2.0);
    expect(mmRatio).toBe(2.0);
  });

  it('should correctly map 1:1 printer dot coordinates at 8 dots/mm', () => {
    expect(DOTS_PER_MM).toBe(8.0);
    expect(mmToDots(PRINTER_CONFIG.widthMM)).toBe(400);
    expect(mmToDots(PRINTER_CONFIG.heightMM)).toBe(200);
    expect(dotsToMm(400)).toBe(50.0);
    expect(dotsToMm(200)).toBe(25.0);
  });

  it('should clamp elements strictly inside the 400x200 dot boundary', () => {
    // Attempt placing an element overflowing beyond 400 dots wide
    const clampedWide = clampToBoundary(380, 50, 50, 40);
    expect(clampedWide.x + clampedWide.width).toBeLessThanOrEqual(400);
    expect(clampedWide.y + clampedWide.height).toBeLessThanOrEqual(200);

    // Negative coordinates should clamp to 0
    const clampedNeg = clampToBoundary(-10, -5, 50, 30);
    expect(clampedNeg.x).toBe(0);
    expect(clampedNeg.y).toBe(0);

    // Clamp element in mm within 50x25 mm
    const clampedEl = clampElementMm({ x: 48, y: 24, width: 8, height: 8 }, 50, 25);
    expect(clampedEl.x + clampedEl.width).toBeLessThanOrEqual(50);
    expect(clampedEl.y + clampedEl.height).toBeLessThanOrEqual(25);
  });

  it('should generate barcode SVG without stretching or compressing', () => {
    const svg = generateBarcodeSvg({
      type: 'code128',
      value: 'CP-123456',
      includeText: false,
    });
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain('object-fit:contain');
  });
});
