import bwipjs from 'bwip-js';

// Cache generated SVGs to optimize canvas rendering
const svgCache = new Map();

/**
 * Supported barcode symbologies mapping to bwip-js IDs
 */
export const BARCODE_TYPES = [
  { id: 'code128', label: 'Code 128 (Standard Industrial)', category: '1d', defaultVal: 'REPHONIX-1001' },
  { id: 'ean13', label: 'EAN-13 (Retail / GS1)', category: '1d', defaultVal: '8901234567890' },
  { id: 'ean8', label: 'EAN-8 (Compact Retail)', category: '1d', defaultVal: '12345670' },
  { id: 'upca', label: 'UPC-A (North American Retail)', category: '1d', defaultVal: '012345678905' },
  { id: 'code39', label: 'Code 39 (Alphanumeric)', category: '1d', defaultVal: 'RPX39' },
  { id: 'itf14', label: 'ITF-14 (Carton Shipping)', category: '1d', defaultVal: '10012345678902' },
  { id: 'qrcode', label: 'QR Code (2D URL / Data)', category: '2d', defaultVal: 'https://rephonix.in' },
  { id: 'datamatrix', label: 'Data Matrix (2D Electronics / IMEI)', category: '2d', defaultVal: '862451049281729' },
  { id: 'pdf417', label: 'PDF417 (High Density 2D)', category: '2d', defaultVal: 'REPHONIX-SECURE-DATA' },
];

/**
 * Generate scalable vector SVG string for any barcode
 */
export function generateBarcodeSvg({
  type = 'code128',
  value = '12345678',
  includeText = true,
  height = 10,
  scale = 2,
  rotate = 'N', // N, R, L, I
  align = 'center', // 'center' | 'left'
}) {
  const cacheKey = `${type}_${value}_${includeText}_${height}_${scale}_${rotate}_${align}`;
  if (svgCache.has(cacheKey)) {
    return svgCache.get(cacheKey);
  }

  try {
    let cleanVal = String(value || '000000').trim();

    // Specific sanitization for symbologies
    if (type === 'ean13') {
      cleanVal = cleanVal.replace(/\D/g, '');
      if (cleanVal.length < 12) cleanVal = cleanVal.padEnd(12, '0');
      if (cleanVal.length > 13) cleanVal = cleanVal.slice(0, 13);
    } else if (type === 'ean8') {
      cleanVal = cleanVal.replace(/\D/g, '');
      if (cleanVal.length < 7) cleanVal = cleanVal.padEnd(7, '0');
      if (cleanVal.length > 8) cleanVal = cleanVal.slice(0, 8);
    } else if (type === 'upca') {
      cleanVal = cleanVal.replace(/\D/g, '');
      if (cleanVal.length < 11) cleanVal = cleanVal.padEnd(11, '0');
      if (cleanVal.length > 12) cleanVal = cleanVal.slice(0, 12);
    }

    const is2D = ['qrcode', 'datamatrix', 'pdf417'].includes(type);

    let svg = bwipjs.toSVG({
      bcid: type,
      text: cleanVal,
      scale: is2D ? 3 : scale || 2,
      height: is2D ? undefined : height || 10,
      includetext: is2D ? false : !!includeText,
      textxalign: align === 'left' ? 'left' : 'center',
      rotate: rotate || 'N',
    });

    const aspect = align === 'left' ? 'xMinYMid meet' : 'xMidYMid meet';
    if (!svg.includes('preserveAspectRatio')) {
      svg = svg.replace('<svg ', `<svg preserveAspectRatio="${aspect}" style="max-width:100%;max-height:100%;object-fit:contain;" `);
    } else {
      svg = svg.replace(/preserveAspectRatio="[^"]*"/, `preserveAspectRatio="${aspect}"`);
      svg = svg.replace('<svg ', '<svg style="max-width:100%;max-height:100%;object-fit:contain;" ');
    }

    svgCache.set(cacheKey, svg);
    return svg;
  } catch (err) {
    console.warn(`Barcode generation failed for [${type}]: ${value}`, err.message);
    // Return friendly placeholder SVG so UI doesn't break
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="100%" height="100%">
        <rect width="200" height="60" fill="#f8fafc" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4" rx="4"/>
        <text x="100" y="28" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#ef4444" text-anchor="middle">INVALID DATA</text>
        <text x="100" y="44" font-family="JetBrains Mono, monospace" font-size="9" fill="#64748b" text-anchor="middle">${String(value).slice(0, 20)}</text>
      </svg>
    `;
    return fallbackSvg;
  }
}
