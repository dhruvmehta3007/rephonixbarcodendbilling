/**
 * WebSerial API helper for direct hardware thermal printer communication.
 * Sends raw bytes (ZPL / TSPL / ESC-POS) directly through USB/COM port.
 */

export const isWebSerialSupported = () => {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
};

export async function sendRawToSerialPrinter(rawText, baudRate = 9600) {
  if (!isWebSerialSupported()) {
    throw new Error('WebSerial is only supported on Chrome, Edge, and Opera browsers.');
  }

  try {
    // Request user to select their USB / Serial thermal printer
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: Number(baudRate) || 9600 });

    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    const data = encoder.encode(rawText);

    await writer.write(data);
    writer.releaseLock();
    await port.close();

    return { success: true };
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw new Error('No printer device was selected.');
    }
    throw error;
  }
}
