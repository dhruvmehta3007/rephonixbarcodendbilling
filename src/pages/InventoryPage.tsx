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
  FileSpreadsheet
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
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT' | 'DAMAGE' | 'RETURN'>('ADJUSTMENT');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

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
    setAdjustType('ADJUSTMENT');
    setAdjustReason('Periodic physical inventory count adjustment');
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);

    try {
      if (!selectedProduct) return;
      if (adjustQty === 0) {
        throw new Error('Quantity change cannot be zero');
      }

      await api.inventory.adjustStock({
        productId: selectedProduct.id,
        quantityChange: Number(adjustQty),
        type: adjustType,
        reason: adjustReason,
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
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Inventory Management & Ledger</h1>
          <p className="text-sm text-[#86868b]">
            Real-time stock control, threshold alerts, and immutable inventory movement audit log
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-white border border-black/[0.08] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'status'
                  ? 'bg-[#0071e3] text-white shadow-md shadow-blue-600/30'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <Boxes size={14} />
              <span>Stock Status</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'ledger'
                  ? 'bg-[#0071e3] text-white shadow-md shadow-blue-600/30'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <History size={14} />
              <span>Movement Ledger</span>
            </button>
          </div>

          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 bg-[#f5f5f7] hover:bg-[#1e2d4d] border border-black/[0.08] text-[#1d1d1f] rounded-xl transition-colors"
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
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-300">{alerts.lowStockCount} Products Low on Stock</div>
                  <div className="text-xs text-amber-400/80">Stock is below minimum safety reorder threshold</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-300">{alerts.outOfStockCount} Products Out of Stock</div>
                  <div className="text-xs text-rose-400/80">Cannot be sold at checkout unless restocked</div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                  <tr>
                    <th className="p-4">PRODUCT</th>
                    <th className="p-4">BARCODE</th>
                    <th className="p-4">CATEGORY</th>
                    <th className="p-4 text-center">CURRENT STOCK</th>
                    <th className="p-4 text-center">MIN. THRESHOLD</th>
                    <th className="p-4 text-center">STATUS</th>
                    <th className="p-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#86868b]">
                        <RefreshCw size={20} className="animate-spin mx-auto text-blue-500 mb-2" />
                        Loading stock levels...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-[#86868b]">
                        No inventory records found.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isOut = p.currentStock <= 0;
                      const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;

                      return (
                        <tr key={p.id} className="hover:bg-[#f5f5f7] transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-[#1d1d1f] text-sm">{p.name}</div>
                          </td>
                          <td className="p-4 font-mono text-blue-400">{p.barcode}</td>
                          <td className="p-4 text-[#86868b]">{p.category?.name || 'Uncategorized'}</td>
                          <td className="p-4 text-center font-mono font-bold text-sm text-[#1d1d1f]">
                            {p.currentStock} {p.unit}
                          </td>
                          <td className="p-4 text-center font-mono text-[#86868b]">
                            {p.minStockThreshold} {p.unit}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isOut
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isLow
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openAdjustModal(p)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold text-xs flex items-center gap-1.5 ml-auto"
                            >
                              <Sliders size={13} />
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
        <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
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
              <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#86868b]">
                      <RefreshCw size={20} className="animate-spin mx-auto text-blue-500 mb-2" />
                      Loading ledger movements...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[#86868b]">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.quantityChange > 0;

                    return (
                      <tr key={m.id} className="hover:bg-[#f5f5f7] transition-colors">
                        <td className="p-4 font-mono text-[#86868b] whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-[#1d1d1f]">{m.product?.name}</div>
                          <div className="text-[10px] text-blue-400 font-mono">{m.product?.barcode}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.type === 'SALE'
                                ? 'bg-blue-500/20 text-blue-300'
                                : m.type === 'RETURN'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : m.type === 'DAMAGE'
                                ? 'bg-rose-500/20 text-rose-300'
                                : m.type === 'PURCHASE'
                                ? 'bg-teal-500/20 text-teal-300'
                                : 'bg-slate-700 text-[#1d1d1f]'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-black text-sm">
                          <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-[#1d1d1f] whitespace-nowrap">
                          {m.stockBefore} → <span className="font-bold text-[#1d1d1f]">{m.stockAfter}</span>
                        </td>
                        <td className="p-4 text-[#1d1d1f] max-w-xs truncate">{m.reason || 'N/A'}</td>
                        <td className="p-4 text-[#86868b] font-medium">{m.user?.fullName || 'System'}</td>
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
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-black/[0.08] bg-[#fbfbfd] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1d1d1f]">Manual Stock Adjustment</h3>
                <p className="text-xs text-[#86868b]">{selectedProduct.name} (Current: {selectedProduct.currentStock} {selectedProduct.unit})</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {adjustError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {adjustError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                >
                  <option value="ADJUSTMENT">Stock Adjustment (Audit / Recount)</option>
                  <option value="DAMAGE">Damaged / Expired Product (Write-off)</option>
                  <option value="RETURN">Customer Return / Exchange</option>
                  <option value="PURCHASE">Direct Inventory Inward</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">
                  Quantity Change (+ to increase, - to decrease)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono text-base font-bold focus:outline-none focus:border-blue-500"
                />
                <div className="text-[11px] text-[#86868b] mt-1">
                  Resulting Stock will be: <span className="text-blue-400 font-bold">{selectedProduct.currentStock + adjustQty} {selectedProduct.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Audit Reason / Justification *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Mandatory reason code for inventory ledger recording..."
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-4 border-t border-black/[0.08] -mx-6 -mb-6 mt-6 bg-[#fbfbfd] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#283852] text-[#1d1d1f] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
