import React, { useState, useEffect } from 'react';
import { 
  Barcode as BarcodeIcon, 
  CheckSquare, 
  Square, 
  Layers, 
  Sliders, 
  LayoutTemplate,
  RefreshCw,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import AppStudio from '../components/BartenderStudio'; // Full WYSIWYG BarTender studio component!

export default function BarcodePage() {
  const [activeTab, setActiveTab] = useState<'quick' | 'studio'>('quick');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [symbology, setSymbology] = useState<'code128' | 'ean13'>('code128');
  const [labelSize, setLabelSize] = useState<'30x15' | '40x20' | '50x25' | '20x40' | '50x30'>('50x25');
  const [showPrice, setShowPrice] = useState(true); // Default to showing MRP / selling price
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [directPrinting, setDirectPrinting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.getAll({ limit: '100' });
      const prods = res.data || [];
      setProducts(prods);

      // Default select first 3 products with 2 copies each
      if (prods.length > 0) {
        const initialIds = prods.slice(0, 3).map((p: any) => p.id);
        setSelectedProductIds(initialIds);
        const initialQty: Record<string, number> = {};
        initialIds.forEach((id: string) => (initialQty[id] = 2));
        setQuantities(initialQty);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelect = (id: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pId) => pId !== id);
      } else {
        setQuantities((q) => ({ ...q, [id]: q[id] || 1 }));
        return [...prev, id];
      }
    });
  };

  const updateQuantity = (id: string, count: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, count) }));
  };

  // Generate queue of labels to print
  const printableLabels = selectedProductIds.flatMap((id) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return [];
    const count = quantities[id] || 1;
    return Array(count).fill(prod);
  });

  const handleDirectTSPLPrint = async () => {
    if (printableLabels.length === 0) return;
    setDirectPrinting(true);
    try {
      const items = printableLabels.map((p) => ({
        name: p.name,
        barcode: p.customValue || p.barcode,
        price: p.sellingPrice || 0,
        quantity: 1,
      }));
      const res = await api.print.directTSPL({
        printerName: '4BARCODE 4B-2054TG',
        items,
        gapMM: 3,
        labelSize,
      });
      alert(res.message || `Successfully sent ${items.length} label(s) directly to 4BARCODE printer!`);
    } catch (err: any) {
      alert('Direct print error: ' + err.message);
    } finally {
      setDirectPrinting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f5f7]">
      {/* Top Switcher Bar */}
      <div className="p-4 border-b border-black/[0.08] bg-white flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
            <BarcodeIcon size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#1d1d1f] tracking-tight">Barcode Generation & Label Studio</h1>
            <p className="text-xs text-[#86868b]">Print device barcode tags, thermal rolls, or design custom labels</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#f5f5f7] p-1 rounded-xl border border-black/[0.08]">
          <button
            onClick={() => setActiveTab('quick')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'quick'
                ? 'bg-[#0071e3] text-white shadow-md shadow-blue-600/30'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Batch Inventory Labels
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'studio'
                ? 'bg-[#0071e3] text-white shadow-md shadow-blue-600/30'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            WYSIWYG BarTender Studio
          </button>
        </div>
      </div>

      {/* ================= TAB 1: QUICK INVENTORY BATCH PRINTING ================= */}
      {activeTab === 'quick' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Product Selection Sidebar */}
          <div className="w-80 lg:w-96 border-r border-black/[0.08] bg-white flex flex-col justify-between no-print overflow-hidden">
            <div className="p-4 border-b border-black/[0.08] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f]">
                Select Products ({selectedProductIds.length})
              </span>
              <button
                onClick={() => {
                  if (selectedProductIds.length === products.length) {
                    setSelectedProductIds([]);
                  } else {
                    setSelectedProductIds(products.map((p) => p.id));
                  }
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
              >
                {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* List */}
            <div className="flex-1 p-3 overflow-y-auto divide-y divide-black/[0.06]/60">
              {products.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProductSelect(p.id)}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-blue-950/30 border border-blue-500/30' : 'hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-blue-400 flex-shrink-0" />
                      ) : (
                        <Square size={16} className="text-[#86868b] flex-shrink-0" />
                      )}
                      <div className="overflow-hidden">
                        <div className="text-xs font-semibold text-[#1d1d1f] truncate">{p.name}</div>
                        <div className="text-[10px] text-[#86868b] font-mono">
                          {p.barcode} • ₹{p.sellingPrice}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-[#86868b]">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={quantities[p.id] || 1}
                          onChange={(e) => updateQuantity(p.id, parseInt(e.target.value, 10) || 1)}
                          className="w-12 px-1.5 py-0.5 rounded bg-[#f5f5f7] border border-black/[0.08] text-[#1d1d1f] font-mono text-xs text-center focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Print Controls Footer */}
            <div className="p-4 border-t border-black/[0.08] bg-[#f5f5f7] space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-[#86868b] block mb-1">Symbology</label>
                  <select
                    value={symbology}
                    onChange={(e) => setSymbology(e.target.value as any)}
                    className="w-full bg-white border border-black/[0.08] rounded-lg px-2 py-1 text-[#1d1d1f] text-xs"
                  >
                    <option value="code128">Code 128 (Standard)</option>
                    <option value="ean13">EAN-13 (GS1 Retail)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#86868b] block mb-1">Label Size</label>
                  <select
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value as any)}
                    className="w-full bg-white border border-black/[0.08] rounded-lg px-2 py-1 text-[#1d1d1f] text-xs font-semibold"
                  >
                    <option value="50x25">50 × 25 mm (Confirmed Spec • 400×200 Dots @ 203 DPI)</option>
                    <option value="30x15">30 × 15 mm (240×120 Dots)</option>
                    <option value="40x20">40 × 20 mm (320×160 Dots)</option>
                    <option value="50x30">50 × 30 mm</option>
                    <option value="20x40">20 × 40 mm (Portrait)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#86868b] pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                  <span>Show Price</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showBarcodeText} onChange={(e) => setShowBarcodeText(e.target.checked)} />
                  <span>Show Barcode</span>
                </label>
              </div>

              <button
                disabled={printableLabels.length === 0 || directPrinting}
                onClick={handleDirectTSPLPrint}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Zap size={16} />
                <span>
                  {directPrinting
                    ? 'Sending to 4BARCODE Hardware...'
                    : `Direct Hardware Print (${printableLabels.length} Slip${printableLabels.length > 1 ? 's' : ''} • Zero Dialog)`}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Live Label Sheet Preview */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#f5f5f7] flex flex-col items-center">
            <div className="w-full max-w-4xl space-y-4">
              <div className="flex items-center justify-between no-print">
                <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider">
                  Live Thermal Label Sheet Preview ({printableLabels.length} total stickers)
                </span>
                <span className="text-xs font-mono text-blue-400 font-bold">{labelSize} mm Thermal Roll</span>
              </div>

              {printableLabels.length === 0 ? (
                <div className="p-16 text-center text-[#86868b] border border-dashed border-black/[0.08] rounded-2xl">
                  Select products on the left to generate barcode preview stickers.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-white border border-black/[0.08] rounded-2xl no-print">
                  {printableLabels.map((prod, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white text-black rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between items-center text-center select-none"
                      style={{
                        width: '100%',
                        maxWidth: labelSize === '20x40' ? '180px' : 'none',
                        aspectRatio: labelSize === '20x40' ? '20/40' : labelSize === '30x15' ? '30/15' : labelSize === '40x20' ? '40/20' : labelSize === '50x30' ? '50/30' : '50/25',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                      }}
                    >
                      {/* CELL POINT Brand Header */}
                      <div className="w-full text-[8px] font-black text-blue-900 uppercase tracking-wider border-b border-gray-200 pb-0.5 leading-none">
                        CELL POINT
                      </div>

                      {/* Device / Product Name */}
                      <div className="w-full text-[8px] font-bold text-gray-950 truncate uppercase tracking-tight my-0.5 leading-tight">
                        {prod.name}
                      </div>

                      {/* Barcode Vector SVG */}
                      <div
                        className="w-full flex items-center justify-center my-0.5 overflow-hidden max-h-[14mm]"
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg({
                            type: symbology,
                            value: prod.barcode || '000000',
                            includeText: false,
                            height: 10,
                            scale: 1,
                          }),
                        }}
                      />

                      {/* Footer: Barcode text + Price */}
                      <div className="w-full flex items-center justify-between text-[7px] border-t border-gray-200 pt-0.5 leading-none">
                        {showBarcodeText && (
                          <span className="font-mono font-semibold text-gray-700 truncate max-w-[55%]">
                            {prod.customValue ? prod.customValue : prod.barcode}
                          </span>
                        )}
                        {showPrice && (
                          <span className="font-extrabold text-gray-950 ml-auto whitespace-nowrap">
                            ₹{(prod.sellingPrice || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                        {!showPrice && !showBarcodeText && (
                          <span className="text-[6px] text-gray-500 uppercase mx-auto">
                            VERIFIED PIECE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: FULL WYSIWYG BARTENDER STUDIO ================= */}
      {activeTab === 'studio' && (
        <div className="flex-1 overflow-hidden relative">
          <AppStudio />
        </div>
      )}
    </div>
  );
}
