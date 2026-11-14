import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle2, Clock, X, Package, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '' });

  // New Purchase Order Modal
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);
  const [poNotes, setPoNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'suppliers') {
        const res = await api.suppliers.getAll();
        setSuppliers(res || []);
      } else {
        const [poRes, prodRes] = await Promise.all([
          api.suppliers.getPurchases(),
          api.products.getAll({ limit: '100' }),
        ]);
        setPurchases(poRes || []);
        setProducts(prodRes.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.suppliers.create(supplierForm);
      setIsSupplierModalOpen(false);
      setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '' });
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddPoItem = () => {
    if (products.length === 0) return;
    setPoItems([...poItems, { productId: products[0].id, quantity: 10, unitCost: products[0].purchasePrice }]);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (poItems.length === 0) {
        alert('Please add at least one product item');
        return;
      }
      await api.suppliers.createPurchase({
        supplierId: selectedSupplierId || undefined,
        notes: poNotes,
        items: poItems,
      });
      setIsPoModalOpen(false);
      setPoItems([]);
      setPoNotes('');
      loadData();
    } catch (err: any) {
      alert('Error creating PO: ' + err.message);
    }
  };

  const handleReceiveStock = async (purchaseId: string) => {
    if (confirm('Confirm receipt of this shipment? Stock quantities will be automatically updated in inventory and logged to the ledger.')) {
      try {
        await api.suppliers.receiveStock(purchaseId);
        loadData();
      } catch (err: any) {
        alert('Error: ' + err.message);
      }
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Suppliers & Purchase Inward</h1>
          <p className="text-sm text-[#86868b]">Manage vendor details, purchase orders, and stock receiving</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-white border border-black/[0.08] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'suppliers' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Vendors
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'purchases' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Purchase Orders
            </button>
          </div>

          {activeTab === 'suppliers' ? (
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Add Vendor</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (products.length > 0) {
                  setPoItems([{ productId: products[0].id, quantity: 10, unitCost: products[0].purchasePrice }]);
                }
                setIsPoModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: SUPPLIERS DIRECTORY ================= */}
      {activeTab === 'suppliers' && (
        <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                <tr>
                  <th className="p-4">SUPPLIER / VENDOR NAME</th>
                  <th className="p-4">CONTACT PERSON</th>
                  <th className="p-4">PHONE</th>
                  <th className="p-4">EMAIL</th>
                  <th className="p-4">GSTIN</th>
                  <th className="p-4 text-center">PURCHASE ORDERS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="p-4 font-semibold text-[#1d1d1f] text-sm">{s.name}</td>
                    <td className="p-4 text-[#1d1d1f]">{s.contactPerson || 'N/A'}</td>
                    <td className="p-4 font-mono text-[#86868b]">{s.phone || 'N/A'}</td>
                    <td className="p-4 text-[#86868b]">{s.email || 'N/A'}</td>
                    <td className="p-4 font-mono text-blue-400">{s.gstin || 'N/A'}</td>
                    <td className="p-4 text-center font-mono font-bold">{s._count?.purchases || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PURCHASE ORDERS & STOCK RECEIPT ================= */}
      {activeTab === 'purchases' && (
        <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                <tr>
                  <th className="p-4">PO NUMBER</th>
                  <th className="p-4">DATE CREATED</th>
                  <th className="p-4">VENDOR</th>
                  <th className="p-4">ITEMS ORDERED</th>
                  <th className="p-4 text-right">TOTAL AMOUNT</th>
                  <th className="p-4 text-center">STATUS</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#1d1d1f]">{p.purchaseNumber}</td>
                    <td className="p-4 font-mono text-[#86868b]">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-[#1d1d1f]">{p.supplier?.name || 'General Supplier'}</td>
                    <td className="p-4 text-[#1d1d1f]">
                      {p.items?.map((i: any) => `${i.product?.name} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      ₹{p.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'RECEIVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {p.status === 'PENDING' ? (
                        <button
                          onClick={() => handleReceiveStock(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 ml-auto"
                        >
                          <CheckCircle2 size={13} />
                          <span>Receive Stock</span>
                        </button>
                      ) : (
                        <span className="text-[#86868b] text-[11px] italic">Inward Confirmed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Supplier */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f]">Add New Supplier</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">GSTIN</label>
                <input
                  type="text"
                  value={supplierForm.gstin}
                  onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Purchase Order */}
      {isPoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f]">Create Purchase Inward Order</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Supplier / Vendor</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Vendor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-[#1d1d1f]">
                  <span>Ordered Items</span>
                  <button type="button" onClick={handleAddPoItem} className="text-blue-400 hover:text-blue-300">
                    + Add Product
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const next = [...poItems];
                        next[idx].productId = e.target.value;
                        const prod = products.find((p) => p.id === e.target.value);
                        if (prod) next[idx].unitCost = prod.purchasePrice;
                        setPoItems(next);
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-[#f5f5f7] border border-black/[0.08] rounded-lg text-xs text-[#1d1d1f]"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...poItems];
                        next[idx].quantity = parseInt(e.target.value, 10) || 1;
                        setPoItems(next);
                      }}
                      className="w-20 px-2 py-1.5 bg-[#f5f5f7] border border-black/[0.08] rounded-lg text-xs text-[#1d1d1f] font-mono"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Cost"
                      value={item.unitCost}
                      onChange={(e) => {
                        const next = [...poItems];
                        next[idx].unitCost = parseFloat(e.target.value) || 0;
                        setPoItems(next);
                      }}
                      className="w-24 px-2 py-1.5 bg-[#f5f5f7] border border-black/[0.08] rounded-lg text-xs text-[#1d1d1f] font-mono"
                    />

                    <button
                      type="button"
                      onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                      className="text-[#86868b] hover:text-rose-400 p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Place Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
