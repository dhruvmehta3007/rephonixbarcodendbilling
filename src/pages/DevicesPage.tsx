import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Scan, 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  DollarSign, 
  Truck, 
  Tag, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  X, 
  Printer, 
  Trash2,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Barcode Scanner input
  const [scannerInput, setScannerInput] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');

  // Intake / Create Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    deviceName: '',
    productId: '',
    barcode: '',
    purchasePrice: 0,
    sellingPrice: 0,
    customValue: '',
    vendorName: '',
    supplierId: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Quick Print Modal for a device sticker
  const [printDevice, setPrintDevice] = useState<any>(null);

  // Mark Sold Modal
  const [sellingDevice, setSellingDevice] = useState<any>(null);
  const [soldPriceInput, setSoldPriceInput] = useState<number | ''>('');
  const [soldNotesInput, setSoldNotesInput] = useState('');
  const [isMarkingSold, setIsMarkingSold] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, conditionFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devRes, prodRes, supRes] = await Promise.all([
        api.devices.getAll({
          search,
          status: statusFilter,
          condition: conditionFilter,
          limit: '100',
        }),
        api.products.getAll({ limit: '200' }),
        api.suppliers.getAll(),
      ]);

      setDevices(devRes.data || []);
      setProducts(prodRes.data || []);
      setSuppliers(supRes || []);
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  // Immediate scanner handler (Enter key triggers lookup)
  const handleScannerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scannerInput.trim();
    if (!code) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupModalOpen(true);

    try {
      const res = await api.devices.lookup(code);
      setLookupResult(res);
      setScannerInput('');
    } catch (err: any) {
      setLookupError(err.message || 'No item found for this barcode');
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setFormData((prev) => ({
      ...prev,
      productId,
      purchasePrice: prod ? prod.purchasePrice : prev.purchasePrice,
      supplierId: prod?.supplierId || prev.supplierId,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceName && !formData.productId) {
      setFormError('Please enter a device name');
      return;
    }
    if (!formData.barcode) {
      setFormError('EAN / Barcode is required');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.devices.create(formData);
      setIsAddModalOpen(false);
      setFormData({
        deviceName: '',
        productId: '',
        barcode: '',
        purchasePrice: 0,
        sellingPrice: 0,
        customValue: '',
        vendorName: '',
        supplierId: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
      });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save device');
    } finally {
      setFormSubmitting(false);
    }
  };

  const printSticker = (device: any) => {
    setPrintDevice(device);
  };

  const handleDeleteDevice = async (device: any) => {
    if (confirm(`Are you sure you want to delete "${device.product?.name || 'Device'}" (Barcode: ${device.barcode})?`)) {
      try {
        await api.devices.delete(device.id);
        if (lookupModalOpen && lookupResult?.data?.id === device.id) {
          setLookupModalOpen(false);
        }
        loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete device');
      }
    }
  };

  const openMarkSoldModal = (device: any) => {
    setSellingDevice(device);
    setSoldPriceInput(device.product?.sellingPrice || '');
    setSoldNotesInput('');
  };

  const handleConfirmMarkSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingDevice) return;

    setIsMarkingSold(true);
    try {
      await api.devices.markSold(sellingDevice.id, {
        soldPrice: soldPriceInput || 0,
        notes: soldNotesInput.trim() || undefined,
      });
      setSellingDevice(null);
      if (lookupModalOpen && lookupResult?.data?.id === sellingDevice.id) {
        // Refresh lookup modal
        const refreshed = await api.devices.lookup(sellingDevice.barcode);
        setLookupResult(refreshed);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark device as sold');
    } finally {
      setIsMarkingSold(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
      {/* Top Banner / Barcode Quick Scan Bar */}
      <div className="p-6 border-b border-slate-200/80 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Scan size={14} /> Serial & Barcode Intelligence
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Device Barcode & Purchase Tracker
          </h1>
          <p className="text-[#86868b] text-sm mt-0.5">
            Scan any device barcode or IMEI to instantly retrieve its purchase cost, date bought, and vendor.
          </p>
        </div>

        {/* Global Instant Barcode Scanner Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <form
            onSubmit={handleScannerSubmit}
            className="relative flex-1 md:w-96 flex items-center"
          >
            <div className="absolute left-3.5 text-blue-600">
              <Scan size={18} className="animate-pulse" />
            </div>
            <input
              ref={scanInputRef}
              type="text"
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              placeholder="Scan Barcode, IMEI or Serial & press Enter..."
              className="w-full bg-slate-50 border-2 border-blue-500 hover:border-blue-600 focus:border-blue-600 text-slate-900 pl-10 pr-24 py-2.5 rounded-xl text-sm font-mono placeholder:text-[#86868b] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 bg-[#0071e3] hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1"
            >
              Scan <ArrowRight size={12} />
            </button>
          </form>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#34c759] hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus size={16} /> Register Device Intake
          </button>
        </div>
      </div>

      {/* Main Content Area: Controls + Device Grid/Table */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-[#86868b]" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                placeholder="Search by Model, IMEI, Serial, Barcode, Invoice..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-xl text-sm placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Filter
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Filter size={14} className="text-[#86868b]" /> Status:
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="SOLD">Sold</option>
                <option value="RESERVED">Reserved</option>
                <option value="REPAIR">In Repair</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              Condition:
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Conditions</option>
                <option value="NEW">Brand New</option>
                <option value="OPEN_BOX">Open Box</option>
                <option value="REFURBISHED">Refurbished</option>
                <option value="PRE_OWNED">Pre-Owned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Smartphone size={17} />
              </div>
              <h2 className="font-extrabold text-slate-900 text-base">Tracked Inventory Units</h2>
              <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 shadow-sm">
                {devices.length} units
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-[#86868b]">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading systematic device records...
            </div>
          ) : devices.length === 0 ? (
            <div className="p-16 text-center text-[#86868b]">
              <Smartphone className="mx-auto text-slate-600 mb-3" size={40} />
              <div className="text-lg font-semibold text-[#1d1d1f]">No Tracked Devices Found</div>
              <p className="text-sm text-[#86868b] max-w-md mx-auto mt-1 mb-4">
                Register a newly bought phone or device with its IMEI, purchase price, date, and vendor to enable 1-scan lookup.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white text-sm font-semibold rounded-xl"
              >
                Register First Device
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[#86868b] text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Device / Model</th>
                    <th className="py-3.5 px-4">Barcode / IMEI</th>
                    <th className="py-3.5 px-4">Date Bought</th>
                    <th className="py-3.5 px-4">Purchase Price</th>
                    <th className="py-3.5 px-4">Supplier / Vendor</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devices.map((dev) => (
                    <tr
                      key={dev.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setLookupResult({ type: 'DEVICE_UNIT', data: dev });
                        setLookupModalOpen(true);
                      }}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {dev.product?.name}
                        </div>
                        <div className="text-xs text-[#86868b] flex items-center gap-2 mt-0.5">
                          {dev.storage && <span>{dev.storage}</span>}
                          {dev.color && <span>• {dev.color}</span>}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                            {dev.condition}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-xs text-blue-700 font-bold">{dev.barcode}</div>
                        {dev.imei1 && (
                          <div className="text-[11px] text-[#86868b]">IMEI: {dev.imei1}</div>
                        )}
                        {dev.serialNumber && (
                          <div className="text-[11px] text-[#86868b]">S/N: {dev.serialNumber}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Calendar size={13} className="text-[#86868b]" />
                          {new Date(dev.purchaseDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-emerald-600">
                          ₹{dev.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {dev.product?.sellingPrice > 0 && (
                          <div className="text-[11px] text-[#86868b] font-medium">
                            Selling: ₹{dev.product.sellingPrice.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700 font-semibold">
                          {dev.supplier?.name || 'Direct / Walk-in'}
                        </div>
                        {dev.purchaseInvoiceNo && (
                          <div className="text-[11px] text-[#86868b]">
                            Inv: {dev.purchaseInvoiceNo}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            dev.status === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : dev.status === 'SOLD'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dev.status === 'IN_STOCK' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          />
                          {dev.status === 'IN_STOCK'
                            ? 'In Stock'
                            : dev.status === 'SOLD'
                            ? 'Sold'
                            : dev.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {dev.status === 'IN_STOCK' && (
                            <button
                              onClick={() => openMarkSoldModal(dev)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-[#34c759] text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                              title="Mark Device as Sold"
                            >
                              <CheckCircle2 size={13} /> Mark Sold
                            </button>
                          )}
                          <button
                            onClick={() => printSticker(dev)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#0071e3] text-slate-700 hover:text-white border border-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                            title="Print Label"
                          >
                            <Printer size={13} /> Label
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(dev)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 text-[#86868b] hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs transition-colors shadow-sm"
                            title="Delete Tracked Unit"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QUICK SCAN LOOKUP MODAL (Pops up when barcode is scanned or row is clicked) */}
      {lookupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-[#0f172a] border-b border-black/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="text-blue-400" size={20} />
                <h3 className="font-extrabold text-[#1d1d1f] text-lg tracking-tight">
                  Barcode Scan Intelligence Record
                </h3>
              </div>
              <button
                onClick={() => setLookupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#18243b] hover:bg-[#223354] flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {lookupLoading ? (
                <div className="py-12 text-center text-[#1d1d1f]">
                  <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  Fetching barcode & purchase history...
                </div>
              ) : lookupError ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-3">
                    <X size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-[#1d1d1f]">Item Not Found</h4>
                  <p className="text-sm text-[#86868b] mt-1">{lookupError}</p>
                </div>
              ) : lookupResult?.type === 'DEVICE_UNIT' ? (
                <div className="space-y-6">
                  {/* Device Header Card */}
                  <div className="bg-white border border-black/[0.08] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-1">
                        {lookupResult.data.product?.category?.name || 'Electronics'}
                      </div>
                      <h2 className="text-xl font-black text-[#1d1d1f]">
                        {lookupResult.data.product?.name}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-[#86868b] mt-1 font-mono">
                        {lookupResult.data.storage && <span>{lookupResult.data.storage}</span>}
                        {lookupResult.data.color && <span>• {lookupResult.data.color}</span>}
                        <span>• Barcode: {lookupResult.data.product?.barcode}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          lookupResult.data.status === 'IN_STOCK'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                            : 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        ● {lookupResult.data.status === 'IN_STOCK' ? 'IN STORE / READY' : lookupResult.data.status}
                      </span>
                    </div>
                  </div>

                  {/* 3 Core Financial & Purchase Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white border border-black/[0.08] rounded-xl p-4">
                      <div className="text-xs text-[#86868b] font-medium flex items-center gap-1.5 mb-1">
                        <DollarSign size={14} className="text-emerald-400" /> Bought Price (Cost)
                      </div>
                      <div className="text-2xl font-black text-emerald-400">
                        ₹{lookupResult.data.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-[#86868b] mt-1">
                        Our acquisition cost
                      </div>
                    </div>

                    <div className="bg-white border border-black/[0.08] rounded-xl p-4">
                      <div className="text-xs text-[#86868b] font-medium flex items-center gap-1.5 mb-1">
                        <Calendar size={14} className="text-blue-400" /> Date Bought
                      </div>
                      <div className="text-lg font-bold text-[#1d1d1f]">
                        {new Date(lookupResult.data.purchaseDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[11px] text-[#86868b] mt-1">
                        {Math.floor(
                          (new Date().getTime() - new Date(lookupResult.data.purchaseDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days in inventory
                      </div>
                    </div>

                    <div className="bg-white border border-black/[0.08] rounded-xl p-4">
                      <div className="text-xs text-[#86868b] font-medium flex items-center gap-1.5 mb-1">
                        <Truck size={14} className="text-amber-400" /> Bought From
                      </div>
                      <div className="text-base font-bold text-[#1d1d1f] truncate">
                        {lookupResult.data.supplier?.name || 'Direct / Walk-in'}
                      </div>
                      <div className="text-[11px] text-[#86868b] mt-1 truncate">
                        {lookupResult.data.purchaseInvoiceNo
                          ? `Bill #${lookupResult.data.purchaseInvoiceNo}`
                          : lookupResult.data.supplier?.phone || 'No invoice ref'}
                      </div>
                    </div>
                  </div>

                  {/* Identification Details */}
                  <div className="bg-white border border-black/[0.08] rounded-2xl p-4 space-y-3 font-mono text-xs">
                    <div className="text-[#86868b] uppercase tracking-wider text-[11px] font-sans font-bold flex items-center gap-1.5">
                      <Tag size={13} className="text-blue-400" /> System Barcodes & Identifiers
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[#f5f5f7] rounded-xl border border-black/[0.08]">
                        <span className="text-[#86868b] block text-[10px]">TAG / SCAN BARCODE:</span>
                        <span className="text-blue-300 font-bold text-sm">{lookupResult.data.barcode}</span>
                      </div>

                      {lookupResult.data.imei1 && (
                        <div className="p-3 bg-[#f5f5f7] rounded-xl border border-black/[0.08]">
                          <span className="text-[#86868b] block text-[10px]">IMEI 1:</span>
                          <span className="text-[#1d1d1f] font-bold text-sm">{lookupResult.data.imei1}</span>
                        </div>
                      )}

                      {lookupResult.data.imei2 && (
                        <div className="p-3 bg-[#f5f5f7] rounded-xl border border-black/[0.08]">
                          <span className="text-[#86868b] block text-[10px]">IMEI 2:</span>
                          <span className="text-[#1d1d1f] font-bold text-sm">{lookupResult.data.imei2}</span>
                        </div>
                      )}

                      {lookupResult.data.serialNumber && (
                        <div className="p-3 bg-[#f5f5f7] rounded-xl border border-black/[0.08]">
                          <span className="text-[#86868b] block text-[10px]">SERIAL NUMBER:</span>
                          <span className="text-[#1d1d1f] font-bold text-sm">{lookupResult.data.serialNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If Sold, show sale information */}
                  {lookupResult.data.status === 'SOLD' && (
                    <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-4">
                      <div className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShoppingBag size={14} /> Sold Details
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[#86868b] block">Status:</span>
                          <span className="text-[#1d1d1f] font-bold">SOLD</span>
                        </div>
                        <div>
                          <span className="text-[#86868b] block">Sold Date:</span>
                          <span className="text-[#1d1d1f]">
                            {lookupResult.data.soldAt
                              ? new Date(lookupResult.data.soldAt).toLocaleDateString()
                              : 'Recent'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#86868b] block">Sold Price:</span>
                          <span className="text-emerald-400 font-bold">
                            {lookupResult.data.soldPrice
                              ? `₹${lookupResult.data.soldPrice.toLocaleString('en-IN')}`
                              : 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleDeleteDevice(lookupResult.data)}
                      className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={14} /> Delete Device
                    </button>
                    <div className="flex items-center gap-2">
                      {lookupResult.data.status === 'IN_STOCK' && (
                        <button
                          onClick={() => {
                            setLookupModalOpen(false);
                            openMarkSoldModal(lookupResult.data);
                          }}
                          className="px-4 py-2.5 bg-[#34c759] hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                        >
                          <CheckCircle2 size={15} /> Mark Sold
                        </button>
                      )}
                      <button
                        onClick={() => printSticker(lookupResult.data)}
                        className="px-4 py-2.5 bg-[#0071e3] hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow"
                      >
                        <Printer size={15} /> Print Barcode Label
                      </button>
                      <button
                        onClick={() => setLookupModalOpen(false)}
                        className="px-4 py-2.5 bg-[#e8e8ed] hover:bg-[#233252] text-[#1d1d1f] text-xs font-medium rounded-xl"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW DEVICE INTAKE MODAL (Clean, Streamlined: Device, Vendor, Bought Price, EAN/Barcode) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-[#fbfbfd] border-b border-black/[0.08] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#1d1d1f] text-base flex items-center gap-2">
                  <Plus size={18} className="text-emerald-400" /> New Device Intake
                </h3>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Each device gets its own unique barcode / EAN.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#e8e8ed] flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300">
                  {formError}
                </div>
              )}

              {/* 1. Device Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Device Name / Model *
                </label>
                <input
                  type="text"
                  required
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  placeholder="e.g. iPhone 15 Pro 128GB Blue / Galaxy S24"
                  className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 2. Vendor / Supplier */}
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Vendor / Supplier *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="e.g. Apex Telecom / Direct Distributor"
                  className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 3. Bought Price, Selling Price (MRP) & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                    Bought Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 45000"
                    className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-bold placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                    Selling Price / MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 52000"
                    className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-blue-400 font-bold placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                    Date Bought
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 4. EAN / Barcode & Label Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1d1d1f]">
                      EAN / Barcode *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          barcode: `890${Date.now().toString().slice(-9)}`,
                        })
                      }
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                    >
                      + Auto EAN
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan EAN barcode or enter code"
                    className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] font-mono placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1d1d1f]">
                      Label Value (Left of MRP)
                    </label>
                    <span className="text-[10px] text-[#86868b]">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formData.customValue}
                    onChange={(e) => setFormData({ ...formData, customValue: e.target.value })}
                    placeholder="e.g. Special code, tag or value"
                    className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#e8e8ed] text-[#1d1d1f] text-sm font-medium rounded-xl hover:bg-[#202f4e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-[#34c759] hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Registering...' : 'Save Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK LABEL STICKER PRINT MODAL */}
      {printDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.08]">
              <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-2">
                <Printer size={16} className="text-blue-400" /> Device Barcode Sticker Preview
              </h4>
              <button
                onClick={() => setPrintDevice(null)}
                className="text-[#86868b] hover:text-[#1d1d1f]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sticker Preview Box: CELL POINT Branding + Device Name + Barcode + MRP (40x20mm thermal roll label) */}
            <div 
              className="printable-label my-6 p-2 bg-white text-black rounded-lg shadow-xl text-center font-sans border border-gray-300 mx-auto flex flex-col justify-between"
              style={{
                width: '100%',
                maxWidth: '280px',
                aspectRatio: '40/20',
              }}
            >
              {/* CELL POINT Header */}
              <div className="w-full flex items-center justify-between border-b border-gray-400 pb-0.5 px-0.5 shrink-0">
                <span className="font-black text-[10.5px] tracking-wider text-blue-900 uppercase">CELL POINT</span>
                <span className="text-[8px] text-gray-600 font-bold tracking-normal uppercase">VERIFIED</span>
              </div>

              {/* Device Name - Bold, Clear & Prominent */}
              <div className="w-full font-black text-[11.5px] text-gray-950 uppercase leading-none tracking-tight px-0.5 py-0.5 shrink-0 truncate">
                {printDevice.product?.name}
              </div>

              {/* Barcode SVG - Scaled to fill printable area nicely */}
              <div className="w-full flex justify-center items-center overflow-hidden my-0.5 max-h-[8mm]">
                <div
                  className="w-full flex justify-center items-center"
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvg({
                      type: 'code128',
                      value: printDevice.barcode || printDevice.imei1 || 'DEVICE',
                      height: 7,
                      scale: 1.15,
                      includeText: false,
                    }),
                  }}
                />
              </div>

              {/* Barcode / Value Code + Selling Price */}
              <div className="w-full flex items-center justify-between border-t border-gray-400 pt-0.5 px-0.5 shrink-0 font-mono text-[9px] font-bold text-gray-900">
                <span>{printDevice.customValue || printDevice.product?.customValue || printDevice.barcode}</span>
                <span className="font-black text-[11px] text-gray-950">
                  MRP: ₹{(printDevice.product?.sellingPrice || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 bg-[#0071e3] hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Printer size={15} /> Send to Label Printer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK DEVICE AS SOLD MODAL */}
      {sellingDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-black/[0.08] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#fbfbfd] border-b border-black/[0.08] flex items-center justify-between">
              <h3 className="font-extrabold text-[#1d1d1f] text-base flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" /> Mark Device Sold
              </h3>
              <button
                onClick={() => setSellingDevice(null)}
                className="w-8 h-8 rounded-full bg-[#e8e8ed] flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmMarkSold} className="p-6 space-y-4">
              <div className="p-3.5 bg-[#f5f5f7] border border-black/[0.08] rounded-2xl space-y-1">
                <div className="text-xs uppercase tracking-wider text-[#86868b] font-bold">
                  Device
                </div>
                <div className="text-sm font-bold text-[#1d1d1f]">
                  {sellingDevice.product?.name}
                </div>
                <div className="text-xs font-mono text-blue-400">
                  Barcode: {sellingDevice.barcode}
                </div>
                <div className="text-xs text-[#86868b] pt-1">
                  Bought Price: <span className="text-emerald-400 font-bold">₹{sellingDevice.purchasePrice?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Actual Sold Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={soldPriceInput}
                  onChange={(e) => setSoldPriceInput(parseFloat(e.target.value) || '')}
                  placeholder="Enter amount customer paid (optional)"
                  className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-bold placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                  Notes / Buyer Name (Optional)
                </label>
                <input
                  type="text"
                  value={soldNotesInput}
                  onChange={(e) => setSoldNotesInput(e.target.value)}
                  placeholder="e.g. Sold to Rahul / Cash Payment"
                  className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setSellingDevice(null)}
                  className="px-4 py-2 bg-[#e8e8ed] text-[#1d1d1f] text-sm font-medium rounded-xl hover:bg-[#202f4e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarkingSold}
                  className="px-5 py-2.5 bg-[#34c759] hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {isMarkingSold ? 'Updating...' : 'Confirm Device Sold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

