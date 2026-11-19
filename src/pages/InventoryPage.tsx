import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  History, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Minus, 
  User, 
  Calendar, 
  X, 
  FileSpreadsheet,
  Smartphone,
  Tag
} from 'lucide-react';
import { api } from '../services/api';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'status' | 'ledger'>('status');
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT' | 'DAMAGE' | 'RETURN' | 'PURCHASE'>('PURCHASE');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [newUnits, setNewUnits] = useState<{ imei: string; customValue: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'status') {
        const [prodsRes, alertsRes] = await Promise.all([
          api.products.getAll({ limit: '100', sortBy: 'currentStock', sortOrder: 'asc' }),
          api.inventory.getAlerts(),
        ]);
        setProducts(prodsRes.data || []);
        setAlerts(alertsRes);
      } else {
        const res = await api.inventory.getMovements({ limit: '100' });
        setMovements(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAdjustModal = (product: any) => {
    setSelectedProduct(product);
    setAdjustQty(1);
    setAdjustType('PURCHASE');
    setAdjustReason('Stock inward / intake');
    setAdjustError(null);
    setNewUnits([{ imei: '', customValue: product.customValue || '' }]);
    setIsAdjustModalOpen(true);
  };

  const addNewUnitRow = () => {
    const prevCost = newUnits[newUnits.length - 1]?.customValue || selectedProduct?.customValue || '';
    const updated = [...newUnits, { imei: '', customValue: prevCost }];
    setNewUnits(updated);
    setAdjustQty(updated.length);
  };

  const removeNewUnitRow = (index: number) => {
    const updated = newUnits.filter((_, i) => i !== index);
    setNewUnits(updated);
    setAdjustQty(updated.length);
  };

  const updateNewUnitRow = (index: number, field: 'imei' | 'customValue', value: string) => {
    setNewUnits(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const generateRandomImei = (index: number) => {
    const prefix = '35';
    let randomDigits = '';
    for (let i = 0; i < 13; i++) {
      randomDigits += Math.floor(Math.random() * 10).toString();
    }
    updateNewUnitRow(index, 'imei', `${prefix}${randomDigits}`);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);

    try {
      if (!selectedProduct) return;
      if (adjustQty === 0) {
        throw new Error('Quantity change cannot be zero');
      }

      // If increasing stock, validate units if provided
      if (adjustQty > 0) {
        const filledUnits = newUnits.map(u => ({ imei: u.imei.trim(), customValue: u.customValue.trim() })).filter(u => Boolean(u.imei));
        if (filledUnits.length > 0) {
          if (filledUnits.length !== adjustQty) {
            throw new Error(`You specified adding ${adjustQty} unit(s), but provided ${filledUnits.length} IMEI(s). Please provide exactly 1 unique IMEI per unit added.`);
          }
          const imeis = filledUnits.map(u => u.imei);
          const uniqueImeis = new Set(imeis);
          if (uniqueImeis.size !== imeis.length) {
            throw new Error('Duplicate IMEI numbers entered. Every device piece must have a unique IMEI.');
          }
        }
      }

      await api.inventory.adjustStock({
        productId: selectedProduct.id,
        quantityChange: Number(adjustQty),
        type: adjustType,
        reason: adjustReason,
        units: adjustQty > 0 ? newUnits.filter(u => Boolean(u.imei.trim())) : undefined,
      });

      setIsAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      setAdjustError(err.message || 'Stock adjustment failed');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Management & Ledger</h1>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            Real-time stock control, threshold alerts, and immutable inventory movement audit log
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-[#0071e3] text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes size={14} />
              <span>Stock Status</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-[#0071e3] text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={14} />
              <span>Movement Ledger</span>
            </button>
          </div>

          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ================= TAB 1: STOCK STATUS ================= */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Summary Warning Banners */}
          {alerts && (alerts.lowStockCount > 0 || alerts.outOfStockCount > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-amber-950">{alerts.lowStockCount} Products Low on Stock</div>
                  <div className="text-xs text-amber-800 font-medium mt-0.5">Stock is at or below minimum safety reorder threshold</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                  <AlertTriangle size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-rose-950">{alerts.outOfStockCount} Products Out of Stock</div>
                  <div className="text-xs text-rose-800 font-medium mt-0.5">Cannot be sold at checkout unless inventory is replenished</div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">PRODUCT</th>
                    <th className="p-4">BARCODE / IMEI</th>
                    <th className="p-4">CATEGORY</th>
                    <th className="p-4 text-center">CURRENT STOCK</th>
                    <th className="p-4 text-center">MIN. THRESHOLD</th>
                    <th className="p-4 text-center">STATUS</th>
                    <th className="p-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <RefreshCw size={20} className="animate-spin mx-auto text-blue-600 mb-2" />
                        <span className="font-semibold text-xs">Loading stock levels...</span>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                        No inventory records found.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isOut = p.currentStock <= 0;
                      const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          </td>
                          <td className="p-4 font-mono font-bold text-xs text-blue-800">{p.barcode}</td>
                          <td className="p-4 text-slate-700 font-medium">{p.category?.name || 'Uncategorized'}</td>
                          <td className="p-4 text-center font-mono font-black text-sm text-slate-950">
                            {p.currentStock} {p.unit}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-700 font-semibold">
                            {p.minStockThreshold} {p.unit}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wide border shadow-2xs ${
                                isOut
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openAdjustModal(p)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 font-bold text-xs flex items-center gap-1.5 ml-auto transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              <Sliders size={13} className="stroke-[2.5]" />
                              <span>Adjust Stock</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: IMMUTABLE MOVEMENT LEDGER ================= */}
      {activeTab === 'ledger' && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">DATE & TIME</th>
                  <th className="p-4">PRODUCT / BARCODE</th>
                  <th className="p-4 text-center">TYPE</th>
                  <th className="p-4 text-center">CHANGE</th>
                  <th className="p-4 text-center">BEFORE → AFTER</th>
                  <th className="p-4">REASON / REFERENCE</th>
                  <th className="p-4">STAFF / CASHIER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      <RefreshCw size={20} className="animate-spin mx-auto text-blue-600 mb-2" />
                      <span className="font-semibold text-xs">Loading ledger movements...</span>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.quantityChange > 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono text-slate-700 font-medium whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-xs">{m.product?.name}</div>
                          <div className="text-[11px] text-blue-800 font-bold font-mono mt-0.5">{m.product?.barcode}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black border tracking-wide ${
                              m.type === 'SALE'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : m.type === 'RETURN'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : m.type === 'DAMAGE'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : m.type === 'PURCHASE'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-black text-sm">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-slate-800 font-semibold whitespace-nowrap">
                          {m.stockBefore} → <span className="font-black text-slate-950">{m.stockAfter}</span>
                        </td>
                        <td className="p-4 text-slate-700 font-medium max-w-xs truncate">{m.reason || 'N/A'}</td>
                        <td className="p-4 text-slate-800 font-bold">{m.user?.fullName || 'System'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MANUAL ADJUSTMENT MODAL ================= */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-[#fbfbfd] flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Inventory Stock Intake & Adjustment</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{selectedProduct.name} (Current: {selectedProduct.currentStock} {selectedProduct.unit})</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {adjustError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {adjustError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Adjustment Action</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="PURCHASE">Add Stock / New Units Intake (+)</option>
                  <option value="ADJUSTMENT">Stock Adjustment (Audit / Recount)</option>
                  <option value="DAMAGE">Damaged / Expired Product (Write-off) (-)</option>
                  <option value="RETURN">Customer Return / Exchange (+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Quantity Change (+ to increase, - to decrease)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setAdjustQty(val);
                    if (val > 0 && newUnits.length !== val) {
                      // Synchronize newUnits array length with requested quantity
                      const current = [...newUnits];
                      const prevCost = current[current.length - 1]?.customValue || selectedProduct?.customValue || '';
                      if (val > current.length) {
                        for (let i = current.length; i < val; i++) {
                          current.push({ imei: '', customValue: prevCost });
                        }
                      } else {
                        current.splice(val);
                      }
                      setNewUnits(current);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <div className="text-xs text-slate-600 font-medium mt-1.5">
                  Resulting Stock will be: <span className="text-blue-700 font-black">{selectedProduct.currentStock + adjustQty} {selectedProduct.unit}</span>
                </div>
              </div>

              {/* Individual Device Units & IMEIs Section for Inward Stock */}
              {adjustQty > 0 && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                        <Smartphone size={15} className="text-blue-600" />
                        <span>Individual Device Barcodes / IMEIs ({newUnits.length} Units)</span>
                      </div>
                      <div className="text-[11px] text-blue-700 mt-0.5">
                        Scan or enter 15-digit IMEI for each piece added. Each piece gets its own unique tracking.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {newUnits.map((u, idx) => (
                      <div key={idx} className="p-2.5 bg-white border border-blue-200 rounded-xl flex items-center gap-2 shadow-2xs">
                        <span className="text-xs font-mono font-bold text-slate-400 w-5 text-right shrink-0">#{idx + 1}</span>
                        <input
                          type="text"
                          required
                          value={u.imei}
                          onChange={(e) => updateNewUnitRow(idx, 'imei', e.target.value)}
                          placeholder="Scan / Type IMEI *"
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={u.customValue}
                          onChange={(e) => updateNewUnitRow(idx, 'customValue', e.target.value)}
                          placeholder="Buying Code"
                          title="Buying price secret code printed on sticker"
                          className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => generateRandomImei(idx)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md border border-slate-300 transition-colors cursor-pointer shrink-0"
                          title="Generate random 15-digit test IMEI"
                        >
                          Gen
                        </button>
                        {newUnits.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeNewUnitRow(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                            title="Remove unit"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addNewUnitRow}
                    className="w-full py-2 bg-white hover:bg-blue-100/50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>Add Another Device IMEI (+1 Unit)</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Audit Reason / Justification *</label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Mandatory reason code for inventory ledger recording..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="p-4 border-t border-slate-100 -mx-6 -mb-6 mt-6 bg-[#fbfbfd] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
