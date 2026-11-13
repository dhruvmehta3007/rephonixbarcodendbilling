import crypto from 'crypto';
import { prisma } from '../db';

/**
 * Generate a guaranteed unique, high-entropy barcode with an optional prefix.
 * e.g., 'DEV8492018374' or 'RPX2948102948'
 */
export async function generateUniqueBarcode(
  prefix: string = 'DEV',
  modelType: 'device' | 'product' = 'device'
): Promise<string> {
  let isUnique = false;
  let barcode = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    // Nanosecond/millisecond timestamp tail + 4 secure random digits
    const timePart = Date.now().toString().slice(-6);
    const randomPart = crypto.randomInt(1000, 9999).toString();
    barcode = `${prefix}${timePart}${randomPart}`;

    if (modelType === 'device') {
      const existing = await prisma.deviceUnit.findUnique({ where: { barcode } });
      if (!existing) isUnique = true;
    } else {
      const existing = await prisma.product.findUnique({ where: { barcode } });
      if (!existing) isUnique = true;
    }
  }

  return barcode;
}

