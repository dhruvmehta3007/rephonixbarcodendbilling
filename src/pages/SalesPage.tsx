import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  RotateCcw, 
  Calendar, 
  User, 
  AlertCircle,
  X,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { printA4Invoice } from '../utils/printA4Invoice';

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Invoice Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);

  // Refund Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundTargetSale, setRefundTargetSale] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('Customer return within 7 days');
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    loadSales();
  }, [search, statusFilter, startDate, endDate]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await api.sales.getAll({
        search,
        status: statusFilter,
        startDate,
        endDate,
        limit: '100',
      });
      setSales(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openInvoiceDetails = async (id: string) => {
    try {
      const res = await api.sales.getById(id);
      setSelectedInvoice(res.sale);
      setShopSettings(res.settings);
    } catch (err: any) {
      alert('Failed to load invoice: ' + err.message);
    }
  };

  const openRefundModal = (sale: any) => {
    setRefundTargetSale(sale);
    setRefundReason('Customer returned product in original condition');
    setIsRefundModalOpen(true);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTargetSale) return;
    setRefundLoading(true);
    try {
      await api.sales.refund(refundTargetSale.id, refundReason);
      setIsRefundModalOpen(false);
      loadSales();
      if (selectedInvoice && selectedInvoice.id === refundTargetSale.id) {
        openInvoiceDetails(refundTargetSale.id);
      }
    } catch (err: any) {
      alert('Refund failed: ' + err.message);
    } finally {
      setRefundLoading(false);
    }
  };

  // Helper to extract unique IMEIs from a sale
  const getSaleImeis = (sale: any): string[] => {
    const imeis: string[] = [];
    sale.items?.forEach((item: any) => {
      if (item.devices && Array.isArray(item.devices)) {
        item.devices.forEach((d: any) => {
          if (d.imei1 && !imeis.includes(d.imei1)) imeis.push(d.imei1);
          if (d.imei2 && !imeis.includes(d.imei2)) imeis.push(d.imei2);
        });
      }
      if (item.barcode && !imeis.includes(item.barcode)) {
        imeis.push(item.barcode);
      }
    });
    return imeis;
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Sales Transactions & Invoicing</h1>
          <p className="text-sm text-[#86868b]">View transaction history, reprint invoices, or process customer returns</p>
        </div>

        <button
          onClick={loadSales}
          title="Refresh"
          className="p-2 bg-[#f5f5f7] hover:bg-[#1e2d4d] border border-black/[0.08] text-[#1d1d1f] rounded-xl transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-black/[0.08] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868b]">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search by IMEI number, invoice, or customer phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="REFUNDED">Refunded / Cancelled</option>
        </select>

        <div className="flex items-center gap-2 text-xs text-[#86868b]">
          <span>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
          />
          <span>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sales History Table */}
      <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
              <tr>
                <th className="p-4">IMEI NUMBER</th>
                <th className="p-4">DATE & TIME</th>
                <th className="p-4">CUSTOMER</th>
                <th className="p-4">CASHIER</th>
                <th className="p-4 text-center">PAYMENT</th>
                <th className="p-4 text-center">STATUS</th>
                <th className="p-4 text-right">TOTAL AMOUNT</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#86868b]">
                    <RefreshCw size={20} className="animate-spin mx-auto text-blue-500 mb-2" />
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[#86868b]">
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="p-4">
                      {(() => {
                        const imeis = getSaleImeis(s);
                        return imeis.length > 0 ? (
                          <div className="space-y-1">
                            {imeis.map((imei, idx) => (
                              <div key={idx} className="font-mono font-bold text-[#1d1d1f] text-sm tracking-wide select-all">
                                {imei}
                              </div>
                            ))}
                            <div className="text-[11px] text-[#86868b] font-mono">
                              #{s.invoiceNumber}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-[#1d1d1f] text-sm">#{s.invoiceNumber}</div>
                            <div className="text-[10px] text-[#86868b]">No IMEI</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4 font-mono text-[#86868b]">
                      {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-[#1d1d1f]">{s.customer?.name || 'Walk-in Customer'}</div>
                      {s.customer?.phone && (
                        <div className="text-[10px] text-[#86868b] font-mono">{s.customer.phone}</div>
                      )}
                    </td>
                    <td className="p-4 text-[#1d1d1f]">{s.cashier?.fullName || 'Staff'}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sm text-emerald-400">
                      ₹{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openInvoiceDetails(s.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 font-semibold text-xs flex items-center gap-1"
                        >
                          <Receipt size={13} />
                          <span>View</span>
                        </button>
                        {s.status === 'COMPLETED' && (
                          <button
                            onClick={() => openRefundModal(s)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 font-semibold text-xs flex items-center gap-1"
                          >
                            <RotateCcw size={13} />
                            <span>Refund</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= INVOICE DETAILS MODAL ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white text-black rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-900 flex items-center justify-between no-print">
              <span className="text-xs font-bold font-mono text-slate-800">Invoice #{selectedInvoice.invoiceNumber}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => printA4Invoice({ sale: selectedInvoice, shopSettings })}
                  className="px-4 py-1.5 bg-[#0071e3] hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print A4 Invoice</span>
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="p-1 rounded-lg text-[#86868b] hover:text-[#1d1d1f]">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="p-6 overflow-y-auto text-xs font-mono select-all print-only">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
                <div className="text-base font-extrabold uppercase">{shopSettings?.shopName || 'REPHONIX STORE'}</div>
                <div className="text-[10px] text-gray-700">{shopSettings?.address}</div>
                <div className="text-[10px] text-gray-700">Phone: {shopSettings?.phone}</div>
                {shopSettings?.gstin && <div className="text-[10px] font-bold">GSTIN: {shopSettings.gstin}</div>}
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>INVOICE: #{selectedInvoice.invoiceNumber}</span>
                  <span>{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cashier: {selectedInvoice.cashier?.fullName || 'Staff'}</span>
                  <span>{selectedInvoice.paymentMethod}</span>
                </div>
                <div className="font-bold">Status: {selectedInvoice.status}</div>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1.5 text-[10px]">
                {selectedInvoice.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {item.productName} × {item.quantity}
                      </div>
                      {item.barcode && (
                        <div className="text-[9px] text-gray-500 font-mono tracking-wider">
                          IMEI: {item.barcode}
                        </div>
                      )}
                    </div>
                    <span className="font-bold">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-sm">
                  <span>TOTAL:</span>
                  <span>₹{selectedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-center pt-4 text-[9px] text-gray-600">
                {shopSettings?.receiptFooter || 'Thank you for shopping with Rephonix!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= REFUND MODAL ================= */}
      {isRefundModalOpen && refundTargetSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
                <RotateCcw size={18} className="text-rose-400" />
                <span>Process Refund & Restock</span>
              </h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300">
              Refunding Invoice <span className="font-bold font-mono">#{refundTargetSale.invoiceNumber}</span> will
              automatically restore stock quantities for all items and create RETURN ledger entries.
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Reason for Return / Refund *</label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#ff3b30] hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 disabled:opacity-50"
                >
                  {refundLoading ? 'Processing...' : 'Confirm Refund & Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
