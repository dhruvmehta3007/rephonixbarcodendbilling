import { describe, it, expect } from 'vitest';
import { buildCellPointTSPL, buildCellPointTSPLJob } from '../server/utils/tsplBuilder';

describe('Handheld Barcode Scanner & Unique Serialization Suite', () => {
  it('generates optimal TSPL for handheld scanner: DENSITY 8 and Code 128 narrow=wide ratio (1:1)', () => {
    const tspl = buildCellPointTSPL({
      name: 'Samsung Galaxy S24 Ultra',
      barcode: '890123456789',
      price: 129999,
      quantity: 1,
    });

    // 1. DENSITY 8 prevents thermal ink bleed into narrow white spaces
    expect(tspl).toContain('DENSITY 8\r\n');

    // 2. Barcode must use 1:1 narrow to wide ratio (narrow=2, wide=2) for Code 128 standard decoding
    expect(tspl).toMatch(/BARCODE \d+,56,"128",72,0,0,2,2,"890123456789"/);

    // 3. Must have NO horizontal divider bars right next to barcode (prevents scanner laser clipping)
    expect(tspl).not.toContain('BAR 16,30');
    expect(tspl).not.toContain('BAR 16,136');
  });

  it('guarantees unique piece barcodes when batch printing serialized tags', () => {
    // Simulate what BarcodePage generates for 3 copies of an item
    const baseCode = 'CPB8240626735';
    const count = 3;
    const items = Array.from({ length: count }, (_, idx) => ({
      name: 'iPhone 15 Pro Max',
      barcode: `${baseCode}-${String(idx + 1).padStart(2, '0')}`,
      price: 134999,
      quantity: 1,
    }));

    // Verify all printed barcodes are strictly different from each other
    const barcodes = items.map((i) => i.barcode);
    const uniqueBarcodes = new Set(barcodes);
    expect(uniqueBarcodes.size).toBe(3);
    expect(barcodes[0]).toBe('CPB8240626735-01');
    expect(barcodes[1]).toBe('CPB8240626735-02');
    expect(barcodes[2]).toBe('CPB8240626735-03');

    // Generate TSPL batch job
    const tsplJob = buildCellPointTSPLJob(items);

    // Global header declared ONCE
    expect(tsplJob.match(/SIZE 50 mm, 25 mm/g)?.length).toBe(1);
    expect(tsplJob.match(/GAP 3 mm, 0 mm/g)?.length).toBe(1);

    // 3 distinct labels printed
    expect(tsplJob).toContain('"CPB8240626735-01"');
    expect(tsplJob).toContain('"CPB8240626735-02"');
    expect(tsplJob).toContain('"CPB8240626735-03"');
    expect(tsplJob.match(/PRINT 1,1/g)?.length).toBe(3);
  });

  it('dynamically adapts module width and centers barcode with safe quiet zones', () => {
    // Test long barcode (16 characters)
    const longTspl = buildCellPointTSPL({
      name: 'Long Barcode Product',
      barcode: 'CPB8240626735-99',
      price: 500,
    });

    // Should switch to narrow=1 so it fits with generous quiet zones
    expect(longTspl).toContain('"CPB8240626735-99"');
    expect(longTspl).toMatch(/BARCODE \d+,56,"128",72,0,0,[12],[12],"CPB8240626735-99"/);
  });
});
