import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, User, Shield, Key, History, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'CASHIER',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.users.getAll();
        setUsers(res || []);
      } else {
        const res = await api.users.getAuditLogs();
        setAuditLogs(res || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.users.create(form);
      setIsModalOpen(false);
      setForm({ username: '', fullName: '', email: '', password: '', role: 'CASHIER' });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.users.toggleStatus(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Staff Accounts & Security Audit</h1>
          <p className="text-sm text-[#86868b]">Manage cashier credentials, role permissions, and view system audit trail</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-white border border-black/[0.08] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'users' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Users & Roles
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'audit' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Audit Trail
            </button>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                <tr>
                  <th className="p-4">USER PROFILE</th>
                  <th className="p-4">USERNAME</th>
                  <th className="p-4">ROLE</th>
                  <th className="p-4">EMAIL</th>
                  <th className="p-4 text-center">BILLS PROCESSED</th>
                  <th className="p-4 text-center">ACCOUNT STATUS</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="p-4 font-semibold text-[#1d1d1f] text-sm">{u.fullName}</td>
                    <td className="p-4 font-mono text-blue-400">@{u.username}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-[#86868b]">{u.email || 'N/A'}</td>
                    <td className="p-4 text-center font-mono font-bold">{u._count?.sales || 0}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          u.isActive ? 'text-rose-400 hover:bg-rose-950/30' : 'text-emerald-400 hover:bg-emerald-950/30'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                <tr>
                  <th className="p-4">DATE & TIME</th>
                  <th className="p-4">STAFF USER</th>
                  <th className="p-4">ACTION</th>
                  <th className="p-4">ENTITY</th>
                  <th className="p-4">AUDIT LOG DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="p-4 font-mono text-[#86868b] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-semibold text-[#1d1d1f]">{log.user?.fullName || 'System'}</td>
                    <td className="p-4 font-mono font-bold text-blue-400">{log.action}</td>
                    <td className="p-4 text-[#86868b]">{log.entity}</td>
                    <td className="p-4 text-[#1d1d1f]">{log.details || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f]">Create Staff Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Role / Permissions</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                >
                  <option value="CASHIER">CASHIER (POS Billing, Stock Scans, Permitted Sales)</option>
                  <option value="ADMIN">ADMIN (Full Store Access, Products, Reports, Settings)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-[#1d1d1f] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
