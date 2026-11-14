import { PRINTER_CONFIG, DOTS_PER_MM } from '../constants/printerConfig';
import { generateBarcodeSvg } from './barcodeGenerator';

/**
 * Substitute dynamic variables like {{model}} or {{barcode}}
 */
function substitute(text, record = {}) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
    const cleanKey = key.trim();
    return record[cleanKey] !== undefined ? record[cleanKey] : match;
  });
}

/**
 * Helper to load an SVG or image URL into an HTMLImageElement
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Render the final label as a 320 × 160 pixel raster image when using a 1:1 printer-dot raster.
 *
 * Requirements:
 * 1. Output canvas is exactly 320 × 160 pixels (1:1 printer-dot raster).
 * 2. Barcodes are drawn without stretching or compression (preserving uniform aspect ratio).
 * 3. All text, lines, badges, and graphics remain strictly inside the 320 × 160 dot boundary.
 * 4. Crisp thermal rendering without fuzzy anti-aliasing.
 */
export async function renderLabelToRasterCanvas(label = {}, elements = [], record = {}, options = {}) {
  const targetWidthDots = options.widthDots || PRINTER_CONFIG.widthDots; // 320
  const targetHeightDots = options.heightDots || PRINTER_CONFIG.heightDots; // 160

  const canvas = document.createElement('canvas');
  canvas.width = targetWidthDots;
  canvas.height = targetHeightDots;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Disable smoothing for sharp 1:1 printer-dot rasterization
  ctx.imageSmoothingEnabled = false;

  // Solid thermal white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidthDots, targetHeightDots);

  // Dots conversion factor from label mm dimensions
  const labelWidthMm = Number(label.width) || PRINTER_CONFIG.widthMM;
  const labelHeightMm = Number(label.height) || PRINTER_CONFIG.heightMM;
  const dotsPerMmX = targetWidthDots / labelWidthMm;
  const dotsPerMmY = targetHeightDots / labelHeightMm;

  for (const el of elements) {
    if (el.visible === false) continue;

    // Convert coordinates to integer printer dots
    let xDots = Math.round(Number(el.x || 0) * dotsPerMmX);
    let yDots = Math.round(Number(el.y || 0) * dotsPerMmY);
    let wDots = Math.round(Number(el.width || 0) * dotsPerMmX);
    let hDots = Math.round(Number(el.height || 0) * dotsPerMmY);

    // Boundary constraint: clamp strictly inside [0, 0, 320, 160]
    wDots = Math.max(1, Math.min(wDots, targetWidthDots));
    hDots = Math.max(1, Math.min(hDots, targetHeightDots));
    xDots = Math.max(0, Math.min(xDots, targetWidthDots - wDots));
    yDots = Math.max(0, Math.min(yDots, targetHeightDots - hDots));

    const contentSubstituted = substitute(el.content, record);

    ctx.save();

    // Clip strictly to element dot boundary to ensure no bleed outside bounds
    ctx.beginPath();
    ctx.rect(xDots, yDots, wDots, hDots);
    ctx.clip();

    if (el.type === 'text') {
      const fontHeightDots = Math.max(8, Math.round((Number(el.fontSize) || 6.5) * (PRINTER_CONFIG.dpi / 72)));
      const fontWeight = el.fontWeight || 'normal';
      const fontFamily = el.fontFamily ? `"${el.fontFamily}", sans-serif` : 'sans-serif';

      ctx.font = `${fontWeight} ${fontHeightDots}px ${fontFamily}`;
      ctx.fillStyle = el.color || '#000000';
      ctx.textBaseline = 'middle';

      let textX = xDots;
      if (el.textAlign === 'center') {
        ctx.textAlign = 'center';
        textX = xDots + wDots / 2;
      } else if (el.textAlign === 'right') {
        ctx.textAlign = 'right';
        textX = xDots + wDots;
      } else {
        ctx.textAlign = 'left';
        textX = xDots;
      }

      const textY = yDots + hDots / 2;
      ctx.fillText(String(contentSubstituted || ''), textX, textY, wDots);
    } else if (el.type === 'barcode' || ['qrcode', 'datamatrix', 'pdf417'].includes(el.type)) {
      const is2D = ['qrcode', 'datamatrix', 'pdf417'].includes(el.type);
      const svgString = generateBarcodeSvg({
        type: is2D ? el.type : (el.symbology || 'code128'),
        value: contentSubstituted,
        includeText: is2D ? false : !!el.showText,
        height: is2D ? undefined : Math.max(8, el.height * 2),
        scale: is2D ? 3 : 2,
      });

      try {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        const img = await loadImage(svgUrl);

        // DO NOT stretch or compress barcode graphics: preserve uniform aspect ratio
        const imgAspect = (img.width || 1) / (img.height || 1);
        const containerAspect = wDots / hDots;
        let drawW = wDots;
        let drawH = hDots;

        if (imgAspect > containerAspect) {
          drawW = wDots;
          drawH = Math.round(wDots / imgAspect);
        } else {
          drawH = hDots;
          drawW = Math.round(hDots * imgAspect);
        }

        // Center inside dot bounding box
        const drawX = xDots + Math.round((wDots - drawW) / 2);
        const drawY = yDots + Math.round((hDots - drawH) / 2);

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } catch (err) {
        console.warn('Failed to rasterize barcode image:', err);
      }
    } else if (el.type === 'line') {
      const lineThickness = Math.max(1, Math.round((Number(el.borderWidth) || 0.5) * dotsPerMmY));
      ctx.fillStyle = el.color || '#000000';
      ctx.fillRect(xDots, yDots, wDots, lineThickness);
    } else if (el.type === 'rect') {
      const borderWidth = Math.max(1, Math.round((Number(el.borderWidth) || 0.5) * dotsPerMmX));
      if (el.fill && el.fill !== 'transparent') {
        ctx.fillStyle = el.fill;
        ctx.fillRect(xDots, yDots, wDots, hDots);
      }
      ctx.strokeStyle = el.borderColor || '#000000';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(
        xDots + borderWidth / 2,
        yDots + borderWidth / 2,
        wDots - borderWidth,
        hDots - borderWidth
      );
    } else if (el.type === 'badge') {
      const borderWidth = Math.max(1, Math.round((Number(el.borderWidth) || 0.4) * dotsPerMmX));
      ctx.strokeStyle = el.color || '#000000';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(
        xDots + borderWidth / 2,
        yDots + borderWidth / 2,
        wDots - borderWidth,
        hDots - borderWidth
      );

      const fontHeightDots = Math.max(8, Math.round(hDots * 0.55));
      ctx.font = `bold ${fontHeightDots}px Inter, sans-serif`;
      ctx.fillStyle = el.color || '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(contentSubstituted || ''), xDots + wDots / 2, yDots + hDots / 2, wDots - borderWidth * 2);
    } else if (el.type === 'image' && el.content) {
      try {
        const img = await loadImage(el.content);
        const imgAspect = img.width / img.height;
        const containerAspect = wDots / hDots;
        let drawW = wDots;
        let drawH = hDots;
        if (imgAspect > containerAspect) {
          drawW = wDots;
          drawH = Math.round(wDots / imgAspect);
        } else {
          drawH = hDots;
          drawW = Math.round(hDots * imgAspect);
        }
        const drawX = xDots + Math.round((wDots - drawW) / 2);
        const drawY = yDots + Math.round((hDots - drawH) / 2);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } catch (e) {
        console.warn('Failed to draw image element in raster:', e);
      }
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Render label directly to a PNG Data URL (320 × 160 px)
 */
export async function renderLabelToRasterDataUrl(label = {}, elements = [], record = {}, options = {}) {
  const canvas = await renderLabelToRasterCanvas(label, elements, record, options);
  return canvas.toDataURL('image/png');
}

/**
 * Render label to Blob (320 × 160 px)
 */
export async function renderLabelToRasterBlob(label = {}, elements = [], record = {}, options = {}) {
  const canvas = await renderLabelToRasterCanvas(label, elements, record, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob from raster canvas'));
    }, 'image/png');
  });
}
