import React, { useState } from 'react';
import { Store, Lock, User, ArrowRight, Shield, Zap } from 'lucide-react';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login({ username, password });
      localStorage.setItem('rephonix_token', res.token);
      localStorage.setItem('rephonix_user', JSON.stringify(res.user));
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#070b16] via-[#0b1020] to-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Warm Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#10182b]/95 backdrop-blur-2xl border border-[#213050] rounded-3xl shadow-2xl shadow-black/50 overflow-hidden p-8 z-10">
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 mx-auto flex items-center justify-center shadow-xl shadow-blue-600/30 mb-4 ring-4 ring-blue-500/20">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Rephonix Barcode</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Smart Retail POS & Device Barcode Suite</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-2.5 bg-[#090e1a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#090e1a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Store'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Fast Demo Accounts */}
        <div className="mt-8 pt-6 border-t border-[#1e293b]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Demo Login Accounts
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => fillCredentials('admin', 'admin123')}
              className="p-2.5 rounded-xl bg-[#162035] hover:bg-[#1f2d4a] border border-[#2a3b5c] text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-blue-400">
                <Shield size={13} className="text-amber-400" />
                <span>Admin Login</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">admin / admin123</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('cashier', 'cashier123')}
              className="p-2.5 rounded-xl bg-[#162035] hover:bg-[#1f2d4a] border border-[#2a3b5c] text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-emerald-400">
                <Zap size={13} className="text-emerald-400" />
                <span>Cashier Login</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">cashier / cashier123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
