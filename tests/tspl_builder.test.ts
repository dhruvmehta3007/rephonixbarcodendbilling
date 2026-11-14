import { describe, it, expect } from 'vitest';
import { buildCellPointTSPL, buildCellPointTSPLJob } from '../server/utils/tsplBuilder';

describe('TSPL Builder Specifications (50x25mm & 30x15mm @ 203 DPI)', () => {
  it('should generate authoritative 50mm x 25mm TSPL by default with 400x200 dots layout and centered THE CELL POINT', () => {
    const tspl = buildCellPointTSPL({
      name: 'Test Product',
      barcode: '890123456789',
      price: 999,
      quantity: 1,
    });

    expect(tspl).toContain('SIZE 50 mm, 25 mm\r\n');
    expect(tspl).toContain('GAP 3 mm, 0 mm\r\n');
    expect(tspl).toContain('DENSITY 8\r\n');
    expect(tspl).toContain('DIRECTION 1\r\n');
    expect(tspl).toContain('CLS\r\n');
    expect(tspl).toContain('TEXT 116,8,"2",0,1,1,"THE CELL POINT"');
    // Code 128 narrow=wide (strictly 1:1) and calculated startX
    expect(tspl).toMatch(/BARCODE \d+,52,"128",66,0,0,2,2,"890123456789"/);
    expect(tspl).toContain('PRINT 1,1\r\n');
  });

  it('should support 30x15mm when specified', () => {
    const tspl = buildCellPointTSPL({
      name: 'Test Product',
      barcode: '890123456789',
      price: 999,
      quantity: 1,
      labelSize: '30x15',
    });

    expect(tspl).toContain('SIZE 30 mm, 15 mm\r\n');
    expect(tspl).toContain('GAP 3 mm, 0 mm\r\n');
    expect(tspl).toContain('TEXT 64,4,"1",0,1,1,"THE CELL POINT"');
    expect(tspl).toContain('BARCODE 8,34,"128",30,0,0,2,2,"890123456789"\r\n');
    expect(tspl).toContain('PRINT 1,1\r\n');
  });

  it('should right-align the price and format as integer rupees on 50x25mm with space for 6+ digits', () => {
    const tspl = buildCellPointTSPL({
      name: 'Samsung Galaxy S23 256GB Phantom Black',
      barcode: '8806094772019',
      price: 56999,
    });

    expect(tspl).toContain('Rs. 56999');
    expect(tspl).toContain('TEXT 240,128,"3",0,1,1,"Rs. 56999"');

    // 6-Digit Price Test (e.g. Rs. 159900)
    const tspl6Digit = buildCellPointTSPL({
      name: 'iPhone 15 Pro Max 1TB Titanium',
      barcode: 'CP880621220350',
      price: 159900,
    });

    expect(tspl6Digit).toContain('Rs. 159900');
    expect(tspl6Digit).toContain('TEXT 224,128,"3",0,1,1,"Rs. 159900"');
    // Barcode text is at X=16, leaving plenty of non-overlapping space before X=224
    expect(tspl6Digit).toContain('TEXT 16,128,"2",0,1,1,"CP880621220350"');
  });

  it('should declare SIZE and GAP ONCE globally when printing multiple items in a batch job', () => {
    const tspl = buildCellPointTSPLJob([
      { name: 'Item 1', barcode: 'CPB111', price: 100 },
      { name: 'Item 2', barcode: 'CPB222', price: 200 },
    ]);

    // SIZE must appear exactly ONCE
    const sizeMatches = tspl.match(/SIZE 50 mm, 25 mm/g);
    expect(sizeMatches?.length).toBe(1);

    // GAP must appear exactly ONCE
    const gapMatches = tspl.match(/GAP 3 mm, 0 mm/g);
    expect(gapMatches?.length).toBe(1);

    // CLS must appear twice (once per label)
    const clsMatches = tspl.match(/CLS/g);
    expect(clsMatches?.length).toBe(2);

    // PRINT 1,1 must appear twice (once per label)
    const printMatches = tspl.match(/PRINT 1,1/g);
    expect(printMatches?.length).toBe(2);
  });
});
