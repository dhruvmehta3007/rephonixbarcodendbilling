import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ScanBarcode, 
  Smartphone, 
  Package, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Truck, 
  TrendingUp, 
  Volume2, 
  VolumeX, 
  History, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Tag, 
  Clock, 
  Printer,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { buildCellPointTSPLJob } from '../utils/tsplBuilder';
import { sendRawToSerialPrinter } from '../utils/webSerial';

interface ScannerPageProps {
  onNavigate?: (tab: any) => void;
}

export default function ScannerPage({ onNavigate }: ScannerPageProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanHistory, setScanHistory] = useState<Array<{
    code: string;
    timestamp: Date;
    data: any;
    type: 'DEVICE_UNIT' | 'PRODUCT_CATALOG';
  }>>([]);
  const [directPrinting, setDirectPrinting] = useState(false);
  const [isPrintingPortal, setIsPrintingPortal] = useState(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount and global scanner wedge capture
  useEffect(() => {
    inputRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If user is already typing in an input or textarea, let it handle naturally
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      // If printable key or scanner gun burst arrives, redirect to input
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Synthetic Audio Chime (C6 clean high chime for success, low buzz for error)
  const playChime = (success = true) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // High affirmative C6
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } else {
        osc.frequency.setValueAtTime(260, ctx.currentTime); // Low error buzz
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch {
      // AudioContext policy suppression fallback
    }
  };

  // Perform lookup on entered or scanned code
  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch ?? barcodeInput).trim();
    if (!code) return;

    setLoading(true);
    setLookupError(null);
    setPrintSuccessMsg(null);

    try {
      const res = await api.devices.lookup(code);
      setLookupResult(res);
      playChime(true);

      // Add to session history (avoid duplicate consecutive)
      setScanHistory((prev) => [
        {
          code,
          timestamp: new Date(),
          data: res.data,
          type: res.type,
        },
        ...prev.filter((h) => h.code !== code).slice(0, 19), // Keep last 20
      ]);

      // Clear input and refocus for next scan
      setBarcodeInput('');
    } catch (err: any) {
      setLookupError(err.message || `No model or inventory found matching "${code}"`);
      setLookupResult(null);
      playChime(false);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Listen for Enter key from Handheld Scanner
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  // Browser Print for the scanned model
  const handleBrowserPrintScanned = () => {
    if (!lookupResult?.data) return;
    setIsPrintingPortal(true);
    document.body.classList.add('printing-portal');
    setTimeout(() => {
      window.print();
      setIsPrintingPortal(false);
      document.body.classList.remove('printing-portal');
    }, 200);
  };

  // Direct USB WebSerial print for the scanned model
  const handleWebSerialPrintScanned = async () => {
    if (!lookupResult?.data) return;
    const itemData = lookupResult.data;
    const isDevice = lookupResult.type === 'DEVICE_UNIT';
    const name = isDevice ? (itemData.product?.name || 'DEVICE') : itemData.name;
    const barcode = itemData.scannedBarcode || (isDevice ? (itemData.barcode || itemData.imei1) : itemData.barcode);
    const price = isDevice ? (itemData.product?.sellingPrice || itemData.purchasePrice || 0) : (itemData.sellingPrice || 0);
    const customValue = itemData.customValue || itemData.product?.customValue;

    setDirectPrinting(true);
    setPrintSuccessMsg(null);
    try {
      const items = [{ name, barcode, customValue, price, quantity: 1 }];
      const tsplCode = buildCellPointTSPLJob(items, {
        gapMM: 3,
        labelSize: '50x25',
        widthMM: 50,
        heightMM: 25,
      });
      await sendRawToSerialPrinter(tsplCode, 9600);
      setPrintSuccessMsg(`1 Slip Printed via USB for ${barcode}!`);
      playChime(true);
    } catch (err: any) {
      if (err.message && !err.message.includes('No printer device was selected')) {
        alert('USB Print error: ' + err.message);
      }
      playChime(false);
    } finally {
      setDirectPrinting(false);
    }
  };

  // Direct Hardware TSPL print for the scanned model (Local Spooler)
  const handleDirectPrintScanned = async () => {
    if (!lookupResult?.data) return;
    const itemData = lookupResult.data;
    const isDevice = lookupResult.type === 'DEVICE_UNIT';

    setDirectPrinting(true);
    setPrintSuccessMsg(null);

    const name = isDevice ? (itemData.product?.name || 'DEVICE') : itemData.name;
    const barcode = itemData.scannedBarcode || (isDevice ? (itemData.barcode || itemData.imei1) : itemData.barcode);
    const price = isDevice ? (itemData.product?.sellingPrice || itemData.purchasePrice || 0) : (itemData.sellingPrice || 0);
    const customValue = itemData.customValue || itemData.product?.customValue;

    try {
      const res = await api.print.directTSPL({
        printerName: '4BARCODE 4B-2054TG',
        labelSize: '50x25',
        items: [{
          name,
          barcode,
          customValue,
          price,
          quantity: 1,
        }],
      });
      setPrintSuccessMsg(res.message || `1 Slip Printed for ${barcode} (50 × 25 mm TSPL)!`);
      playChime(true);
    } catch (err: any) {
      const isCloudEnv =
        err.message?.includes('Render') ||
        err.message?.includes('Linux') ||
        err.message?.includes('Windows') ||
        err.message?.includes('spooler') ||
        err.message?.includes('ENOENT');

      if (isCloudEnv) {
        if (confirm(`${err.message}\n\nWould you like to print this sticker using Browser Print instead?`)) {
          handleBrowserPrintScanned();
        }
      } else {
        alert('Direct print error: ' + err.message);
      }
      playChime(false);
    } finally {
      setDirectPrinting(false);
    }
  };

  const isDevice = lookupResult?.type === 'DEVICE_UNIT';
  const model = lookupResult?.data;

  // Calculate profit margin if financial data available
  const purchaseCost = isDevice ? (model?.purchasePrice || 0) : (model?.purchasePrice || 0);
  const sellPrice = isDevice ? (model?.product?.sellingPrice || 0) : (model?.sellingPrice || 0);
  const profitMargin = sellPrice > 0 ? sellPrice - purchaseCost : 0;
  const marginPercent = purchaseCost > 0 ? ((profitMargin / purchaseCost) * 100).toFixed(1) : '0';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f5f7]">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-black/[0.08] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-600">
            <ScanBarcode size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-[#1d1d1f] tracking-tight">
                Barcode Scanner & Model Detective
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                HANDHELD READY
              </span>
            </div>
            <p className="text-xs text-[#86868b]">
              Pull the trigger on your handheld scanner to instantly detect complete model specs & financials
            </p>
          </div>
        </div>

        {/* Sound Feedback Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            soundEnabled
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}
          title="Toggle scan audio chimes"
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>Audio Chimes: {soundEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Column: Active Scanner & Model Dossier */}
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
          {/* Handheld Scanner Input Bar */}
          <div className="bg-white border-2 border-blue-500/40 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl p-2.5 shadow-sm flex items-center gap-3 transition-all">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <ScanBarcode size={22} className="animate-pulse" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan barcode with handheld scanner or type Barcode / IMEI / Serial..."
              className="flex-1 bg-transparent text-[#1d1d1f] font-mono text-sm font-semibold placeholder:text-[#86868b] focus:outline-none"
              autoFocus
            />
            {barcodeInput && (
              <button
                onClick={() => {
                  setBarcodeInput('');
                  inputRef.current?.focus();
                }}
                className="text-xs text-[#86868b] hover:text-[#1d1d1f] font-semibold px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => handleLookup()}
              disabled={!barcodeInput.trim() || loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {loading ? (
                <span>Searching...</span>
              ) : (
                <>
                  <span>Lookup</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

          {/* Error Alert */}
          {lookupError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-800 animate-in fade-in duration-150">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Item Not Found</div>
                <div className="text-sm font-medium text-red-900 mt-0.5">{lookupError}</div>
              </div>
            </div>
          )}

          {/* Print Success Alert */}
          {printSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-emerald-800 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">{printSuccessMsg}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono">50 × 25 mm • No Dialog</span>
            </div>
          )}

          {/* Scanned Model Details Dossier Card */}
          {model ? (
            <div className="bg-white border border-black/[0.08] rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-150">
              {/* Header: Title & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-black/[0.06] pb-5">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-100 text-blue-800">
                      {isDevice ? 'TRACKED DEVICE UNIT' : 'CATALOG PRODUCT'}
                    </span>
                    {isDevice && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                        model.status === 'IN_STOCK'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : model.status === 'SOLD'
                          ? 'bg-gray-100 text-gray-700 border border-gray-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        ● {model.status === 'IN_STOCK' ? 'IN STORE / READY' : model.status}
                      </span>
                    )}
                    {isDevice && model.condition && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-100 text-purple-800">
                        {model.condition}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-[#1d1d1f] tracking-tight">
                    {isDevice ? (model.product?.name || 'Pre-owned Mobile Unit') : model.name}
                  </h2>
                  <div className="text-xs text-[#86868b] font-medium flex items-center gap-2">
                    {isDevice && model.storage && <span>Capacity: {model.storage}</span>}
                    {isDevice && model.color && <span>• Color: {model.color}</span>}
                    {model.product?.category?.name && (
                      <span>• Category: {model.product.category.name}</span>
                    )}
                    {model.category?.name && <span>• Category: {model.category.name}</span>}
                  </div>
                </div>

                {/* Scanned Barcode Graphic Preview */}
                <div className="flex flex-col items-center p-3 bg-[#f5f5f7] rounded-2xl border border-black/[0.06] shrink-0">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvg({
                        type: 'code128',
                        value: model.scannedBarcode || (isDevice ? model.barcode || model.imei1 : model.barcode) || '000000',
                        height: 12,
                        scale: 1,
                        includeText: false,
                      }),
                    }}
                  />
                  <span className="text-[10px] font-mono font-bold text-gray-700 mt-1">
                    {model.scannedBarcode || (isDevice ? model.barcode || model.imei1 : model.barcode)}
                  </span>
                </div>
              </div>

              {/* Specs & Identifiers Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-2.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-blue-500" /> Device Identifiers & Hardware Details
                </h3>
                <div className={`grid grid-cols-2 ${isDevice ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} gap-3`}>
                  <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                    <div className="text-[10px] text-[#86868b] uppercase font-bold">
                      {isDevice ? 'Device IMEI' : 'Barcode Tag'}
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-800 mt-0.5 truncate">
                      {model.imei1 || model.barcode || model.scannedBarcode || 'N/A'}
                    </div>
                  </div>

                  {isDevice && (
                    <>
                      <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] text-[#86868b] uppercase font-bold">Secret Buying Code</div>
                        <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5 truncate">
                          {model.customValue || model.product?.customValue || 'N/A'}
                        </div>
                      </div>

                      <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] text-[#86868b] uppercase font-bold">Serial Number</div>
                        <div className="text-xs font-mono font-bold text-[#1d1d1f] mt-0.5 truncate">
                          {model.serialNumber || 'N/A'}
                        </div>
                      </div>
                    </>
                  )}

                  {!isDevice && (
                    <>
                      <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] text-[#86868b] uppercase font-bold">IMEI Number</div>
                        <div className="text-xs font-mono font-bold text-blue-700 mt-0.5 truncate">
                          {model.barcode || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-[#f5f5f7] p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] text-[#86868b] uppercase font-bold">Current Stock</div>
                        <div className="text-xs font-black text-emerald-600 mt-0.5">
                          {model.currentStock || 0} Units
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Financial Breakdown (Cost, Selling MRP, Profit Margin) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-2.5 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-emerald-500" /> Commercial & Profit Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                      Selling Price (MRP)
                    </div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">
                      ₹{sellPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-emerald-800/80 mt-1">Retail sticker value</div>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                      Bought Price (Cost)
                    </div>
                    <div className="text-2xl font-black text-blue-700 mt-1">
                      ₹{purchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-blue-800/80 mt-1">Our acquisition cost</div>
                  </div>

                  <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4">
                    <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">
                      Expected Profit Margin
                    </div>
                    <div className="text-2xl font-black text-purple-700 mt-1 flex items-baseline gap-1.5">
                      <span>₹{profitMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs font-bold text-purple-600">({marginPercent}%)</span>
                    </div>
                    <div className="text-[10px] text-purple-800/80 mt-1">Gross return on piece</div>
                  </div>
                </div>
              </div>

              {/* Provenance & Lifecycle History */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.06] space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                    <Truck size={13} className="text-amber-500" /> Acquired From (Vendor)
                  </div>
                  <div className="text-sm font-bold text-[#1d1d1f]">
                    {model.supplier?.name || (isDevice ? model.vendorName || 'Direct / Walk-in Customer' : 'Standard Supplier')}
                  </div>
                  {isDevice && model.purchaseInvoiceNo && (
                    <div className="text-xs text-[#86868b] font-mono">
                      Invoice No: {model.purchaseInvoiceNo}
                    </div>
                  )}
                </div>

                <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.06] space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-500" /> Date Ingested
                  </div>
                  <div className="text-sm font-bold text-[#1d1d1f]">
                    {model.purchaseDate ? new Date(model.purchaseDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : 'Recorded in Catalog'}
                  </div>
                  {isDevice && model.purchaseDate && (
                    <div className="text-xs text-[#86868b] font-medium flex items-center gap-1">
                      <Clock size={12} />
                      {Math.floor((new Date().getTime() - new Date(model.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))} days in stock
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Multi-mode Hardware Print & POS Billing */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    disabled={directPrinting}
                    onClick={handleDirectPrintScanned}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={16} />
                    <span>
                      {directPrinting ? 'Sending to 4BARCODE Hardware...' : 'Direct Hardware Print (4BARCODE • Zero Dialog)'}
                    </span>
                  </button>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('pos')}
                      className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Open in POS</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleBrowserPrintScanned}
                  className="w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Browser Print (Preview / Dialog)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Idle Ready Radar State */
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white border border-dashed border-black/[0.12] rounded-3xl text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 relative">
                <ScanBarcode size={40} />
                <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-[#1d1d1f]">
                  Handheld Barcode Scanner Ready
                </h3>
                <p className="text-xs text-[#86868b]">
                  Scan any 50×25mm sticker, retail product, phone box, or IMEI tag. The full model breakdown, cost, selling price, and profit margin will populate here instantly.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Session Scan History */}
        <div className="w-80 lg:w-96 bg-white border border-black/[0.08] rounded-3xl p-4 flex flex-col overflow-hidden shrink-0 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1d1d1f]">
              <History size={15} className="text-blue-600" />
              <span>Session History ({scanHistory.length})</span>
            </div>
            {scanHistory.length > 0 && (
              <button
                onClick={() => setScanHistory([])}
                className="text-[11px] text-[#86868b] hover:text-red-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04]">
            {scanHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#86868b] space-y-1">
                <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                <div>No scans in this session yet.</div>
                <div className="text-[10px]">Scanned items will be logged here.</div>
              </div>
            ) : (
              scanHistory.map((h, i) => (
                <div
                  key={i}
                  onClick={() => handleLookup(h.code)}
                  className="py-2.5 px-2 hover:bg-[#f5f5f7] rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="overflow-hidden pr-2">
                    <div className="text-xs font-bold text-[#1d1d1f] truncate group-hover:text-blue-600 transition-colors">
                      {h.type === 'DEVICE_UNIT' ? (h.data.product?.name || 'Device') : h.data.name}
                    </div>
                    <div className="text-[10px] text-[#86868b] mt-0.5 flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-800">
                        ₹{(h.type === 'DEVICE_UNIT' ? (h.data.product?.sellingPrice || h.data.purchasePrice || 0) : (h.data.sellingPrice || 0)).toLocaleString('en-IN')}
                      </span>
                      {h.data.storage && <span>• {h.data.storage}</span>}
                      {h.data.color && <span>• {h.data.color}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Hidden Portal for Clean Scanned Sticker Thermal Printing */}
      {isPrintingPortal && lookupResult?.data && typeof document !== 'undefined' && createPortal(
        <div id="printable-root" className="printable-labels-container">
          <div className="batch-barcode-sticker">
            <div className="w-full flex items-center justify-center border-b border-black/20 pb-0.5 leading-none">
              <span className="text-[10px] font-black text-black uppercase tracking-wider mx-auto">THE CELL POINT</span>
            </div>
            <div className="w-full text-[8px] font-bold text-black truncate uppercase tracking-tight my-0.5 leading-tight text-left pl-1.5 pr-1">
              {lookupResult.type === 'DEVICE_UNIT' ? (lookupResult.data.product?.name || 'DEVICE') : lookupResult.data.name}
            </div>
            <div
              className="w-full flex items-center justify-start my-0.5 overflow-hidden max-h-[14mm] pl-1.5"
              dangerouslySetInnerHTML={{
                __html: generateBarcodeSvg({
                  type: 'code128',
                  value: lookupResult.data.scannedBarcode || (lookupResult.type === 'DEVICE_UNIT' ? (lookupResult.data.barcode || lookupResult.data.imei1) : lookupResult.data.barcode) || '000000',
                  includeText: false,
                  height: 12,
                  scale: 1,
                  align: 'left',
                }),
              }}
            />
            <div className="w-full flex items-center justify-between text-[7px] border-t border-black/20 pt-0.5 leading-none pl-1.5 pr-1">
              <span className="font-mono font-semibold text-black truncate max-w-[55%]">
                {lookupResult.data.customValue || lookupResult.data.product?.customValue || lookupResult.data.scannedBarcode || (lookupResult.type === 'DEVICE_UNIT' ? (lookupResult.data.barcode || lookupResult.data.imei1) : lookupResult.data.barcode)}
              </span>
              <span className="font-extrabold text-black ml-auto whitespace-nowrap">
                MRP: ₹{(lookupResult.type === 'DEVICE_UNIT' ? (lookupResult.data.product?.sellingPrice || lookupResult.data.purchasePrice || 0) : (lookupResult.data.sellingPrice || 0)).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
