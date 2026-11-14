import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Receipt, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.customers.getAll({ search });
      setCustomers(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.customers.create(formData);
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '' });
      loadCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save customer');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Customer Directory & Accounts</h1>
          <p className="text-sm text-[#86868b]">Track customer profiles, phone numbers, and total lifetime spend</p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', phone: '', email: '', address: '' });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
        >
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white border border-black/[0.08]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868b]">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search by customer name, phone number or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
              <tr>
                <th className="p-4">CUSTOMER NAME</th>
                <th className="p-4">PHONE NUMBER</th>
                <th className="p-4">EMAIL</th>
                <th className="p-4">ADDRESS / CITY</th>
                <th className="p-4 text-center">TOTAL TRANSACTIONS</th>
                <th className="p-4 text-right">LIFETIME SPEND</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#f5f5f7] transition-colors">
                  <td className="p-4 font-semibold text-[#1d1d1f] text-sm">{c.name}</td>
                  <td className="p-4 font-mono text-[#1d1d1f]">{c.phone || 'N/A'}</td>
                  <td className="p-4 text-[#86868b]">{c.email || 'N/A'}</td>
                  <td className="p-4 text-[#86868b] max-w-xs truncate">{c.address || 'N/A'}</td>
                  <td className="p-4 text-center font-mono font-bold">{c._count?.sales || 0}</td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    ₹{(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f]">Add New Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Address / City</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
