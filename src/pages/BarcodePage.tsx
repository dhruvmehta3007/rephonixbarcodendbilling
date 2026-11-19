import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Barcode as BarcodeIcon, 
  CheckSquare, 
  Square, 
  Layers, 
  Sliders, 
  LayoutTemplate,
  RefreshCw,
  Zap,
  Printer
} from 'lucide-react';
import { api } from '../services/api';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { buildCellPointTSPLJob } from '../utils/tsplBuilder';
import { sendRawToSerialPrinter } from '../utils/webSerial';
import AppStudio from '../components/BartenderStudio'; // Full WYSIWYG BarTender studio component!

export default function BarcodePage() {
  const [activeTab, setActiveTab] = useState<'quick' | 'studio'>('quick');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [symbology, setSymbology] = useState<'code128' | 'ean13'>('code128');
  const [labelSize, setLabelSize] = useState<'50x25'>('50x25');
  const [showPrice, setShowPrice] = useState(true); // Default to showing MRP / selling price
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [directPrinting, setDirectPrinting] = useState(false);
  const [isPrintingPortal, setIsPrintingPortal] = useState(false);
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

      // Default select only the first product with 1 copy
      if (prods.length > 0) {
        const firstId = prods[0].id;
        setSelectedProductIds([firstId]);
        setQuantities({ [firstId]: 1 });
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
    const prod = products.find((p) => p.id === id);
    const maxStock = prod?.devices?.length || prod?.currentStock || 999;
    const validCount = Math.max(1, Math.min(count, maxStock));
    setQuantities((prev) => ({ ...prev, [id]: validCount }));
  };

  // Generate queue of labels to print with unique piece barcodes
  const printableLabels = selectedProductIds.flatMap((id) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return [];
    const inStockUnits = prod.devices && prod.devices.length > 0 ? prod.devices : [];
    const count = Math.max(1, quantities[id] || 1);

    return Array.from({ length: count }, (_, idx) => {
      const pieceNum = idx + 1;
      const unit = inStockUnits[idx];
      // Every physical piece gets its own real unique 15-digit IMEI and its secret label code
      const pieceBarcode = unit?.imei1 || unit?.barcode || prod.barcode || '000000';
      const pieceCustomValue = unit?.customValue || prod.customValue;

      return {
        ...prod,
        uniqueBarcode: pieceBarcode,
        customValue: pieceCustomValue,
        pieceNumber: pieceNum,
        totalPieces: count,
      };
    });
  });

  const handleBrowserPrint = () => {
    if (printableLabels.length === 0) return;
    setIsPrintingPortal(true);
    document.body.classList.add('printing-portal');
    setTimeout(() => {
      window.print();
      setIsPrintingPortal(false);
      document.body.classList.remove('printing-portal');
    }, 200);
  };

  const handleWebSerialPrint = async () => {
    if (printableLabels.length === 0) return;
    setDirectPrinting(true);
    try {
      const items = printableLabels.map((p) => ({
        name: p.name,
        barcode: p.uniqueBarcode || p.barcode,
        customValue: p.customValue,
        price: p.sellingPrice ?? p.price ?? 0,
        quantity: 1,
      }));
      const tsplCode = buildCellPointTSPLJob(items, {
        gapMM: 3,
        labelSize,
        widthMM: 50,
        heightMM: 25,
      });
      await sendRawToSerialPrinter(tsplCode, 9600);
      alert(`Successfully sent ${items.length} label(s) directly to USB printer!`);
    } catch (err: any) {
      if (err.message && !err.message.includes('No printer device was selected')) {
        alert('USB Print error: ' + err.message);
      }
    } finally {
      setDirectPrinting(false);
    }
  };

  const handleDirectTSPLPrint = async () => {
    if (printableLabels.length === 0) return;
    setDirectPrinting(true);
    try {
      const items = printableLabels.map((p) => ({
        name: p.name,
        barcode: p.uniqueBarcode || p.barcode,
        customValue: p.customValue,
        price: p.sellingPrice ?? p.price ?? 0,
        quantity: 1, // 1 label per unique piece
      }));
      const res = await api.print.directTSPL({
        printerName: '4BARCODE 4B-2054TG',
        items,
        gapMM: 3,
        labelSize,
      });
      alert(res.message || `Successfully sent ${items.length} label(s) directly to 4BARCODE printer!`);
    } catch (err: any) {
      const isCloudEnv =
        err.message?.includes('Render') ||
        err.message?.includes('Linux') ||
        err.message?.includes('Windows') ||
        err.message?.includes('spooler') ||
        err.message?.includes('ENOENT');

      if (isCloudEnv) {
        if (confirm(`${err.message}\n\nWould you like to print these labels using Browser Print instead?`)) {
          handleBrowserPrint();
        }
      } else {
        alert('Direct print error: ' + err.message);
      }
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
                        <div className="text-[10px] text-[#86868b] flex items-center gap-1.5 mt-0.5">
                          <span>₹{Number(p.sellingPrice).toLocaleString('en-IN')}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">{p.currentStock || (p.devices ? p.devices.length : 0)} pcs in stock</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-[#86868b] font-medium">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max={p.devices?.length || p.currentStock || 999}
                          value={quantities[p.id] || 1}
                          onChange={(e) => updateQuantity(p.id, parseInt(e.target.value, 10) || 1)}
                          className="w-12 px-1.5 py-0.5 rounded bg-white border border-black/[0.12] text-[#1d1d1f] font-mono text-xs text-center focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-white border border-black/[0.08] rounded-lg px-2 py-1 text-[#1d1d1f] text-xs font-semibold cursor-default"
                  >
                    <option value="50x25">50 × 25 mm (Standard Roll • 400×200 Dots)</option>
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

              <div className="space-y-2 pt-1">
                {/* Primary Button: Direct Hardware Print (Zero Dialog) */}
                <button
                  disabled={printableLabels.length === 0 || directPrinting}
                  onClick={handleDirectTSPLPrint}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Zap size={16} />
                  <span>
                    {directPrinting
                      ? 'Sending to 4BARCODE Hardware...'
                      : `Direct Hardware Print (${printableLabels.length} Slip${printableLabels.length > 1 ? 's' : ''} • Zero Dialog)`}
                  </span>
                </button>

                {/* Secondary Button: Browser Print Dialog */}
                <button
                  disabled={printableLabels.length === 0}
                  onClick={handleBrowserPrint}
                  className="w-full py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Browser Print (Preview / Dialog)</span>
                </button>
              </div>
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
                      className="py-1 px-1 bg-white text-black rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between items-center text-center select-none"
                      style={{
                        width: '100%',
                        aspectRatio: '50/25',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                      }}
                    >
                      {/* REPHONIX Brand Header */}
                      <div className="w-full flex items-center justify-between border-b border-gray-200 pb-0.5 leading-none">
                        <span className="text-[10px] font-black text-black uppercase tracking-wider mx-auto">REPHONIX</span>
                      </div>

                      {/* Device / Product Name (Reduced Left Margin) */}
                      <div className="w-full text-[7.5px] font-bold text-gray-950 truncate uppercase tracking-tight my-0.5 leading-tight text-left pl-1.5 pr-1">
                        {prod.name}
                      </div>

                      {/* Barcode Vector SVG (Reduced Left Margin) */}
                      <div
                        className="w-full flex items-center justify-start my-0.5 overflow-hidden max-h-[14mm] pl-1.5"
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg({
                            type: symbology,
                            value: prod.uniqueBarcode || prod.barcode || '000000',
                            includeText: false,
                            height: 10,
                            scale: 1,
                            align: 'left',
                          }),
                        }}
                      />

                      {/* Footer: Barcode text + Price (Balanced Baseline) */}
                      <div className="w-full flex items-baseline justify-between text-[7px] border-t border-gray-200 pt-0.5 leading-none px-0.5">
                        {showBarcodeText && (
                          <span className="font-mono font-semibold text-gray-700 truncate max-w-[48%] text-left">
                            {prod.customValue || prod.uniqueBarcode || prod.barcode}
                          </span>
                        )}
                        {showPrice && (
                          <span className="font-extrabold text-gray-950 ml-auto text-right whitespace-nowrap">
                            ₹{Number(prod.sellingPrice ?? prod.price ?? 0).toLocaleString('en-IN')}
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

      {/* Hidden Portal for Clean Thermal Roll Printing */}
      {isPrintingPortal && typeof document !== 'undefined' && createPortal(
        <div id="printable-root" className="printable-labels-container">
          {printableLabels.map((prod, idx) => (
            <div key={idx} className="batch-barcode-sticker">
              {/* REPHONIX Brand Header */}
              <div className="w-full flex items-center justify-between border-b border-black/20 pb-0.5 leading-none">
                <span className="text-[10px] font-black text-black uppercase tracking-wider mx-auto">REPHONIX</span>
              </div>

              {/* Device / Product Name (Reduced Left Margin) */}
              <div className="w-full text-[7.5px] font-bold text-black truncate uppercase tracking-tight my-0.5 leading-tight text-left pl-1.5 pr-1">
                {prod.name}
              </div>

              {/* Barcode Vector SVG (Reduced Left Margin) */}
              <div
                className="w-full flex items-center justify-start my-0.5 overflow-hidden max-h-[14mm] pl-1.5"
                dangerouslySetInnerHTML={{
                  __html: generateBarcodeSvg({
                    type: symbology,
                    value: prod.uniqueBarcode || prod.barcode || '000000',
                    includeText: false,
                    height: 10,
                    scale: 1,
                    align: 'left',
                  }),
                }}
              />

              {/* Footer: Barcode text + Price (Balanced Baseline) */}
              <div className="w-full flex items-baseline justify-between text-[7px] border-t border-black/20 pt-0.5 leading-none px-0.5">
                {showBarcodeText && (
                  <span className="font-mono font-semibold text-black truncate max-w-[48%] text-left">
                    {prod.customValue || prod.uniqueBarcode || prod.barcode}
                  </span>
                )}
                {showPrice && (
                  <span className="font-extrabold text-black ml-auto text-right whitespace-nowrap">
                    ₹{Number(prod.sellingPrice ?? prod.price ?? 0).toLocaleString('en-IN')}
                  </span>
                )}
                {!showPrice && !showBarcodeText && (
                  <span className="text-[6px] text-black uppercase mx-auto">
                    VERIFIED PIECE
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
