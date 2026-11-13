import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  Receipt, 
  CreditCard, 
  Plus, 
  RefreshCw,
  Barcode,
  Boxes
} from 'lucide-react';
import { api } from '../services/api';
import { NavItem } from '../components/Sidebar';

interface DashboardProps {
  onNavigate: (tab: NavItem) => void;
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw size={20} className="animate-spin text-blue-500" />
        <span>Loading live dashboard analytics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 p-8">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
          {error || 'Unable to load dashboard data.'}
          <button onClick={fetchStats} className="ml-3 underline font-semibold">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Overview</h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">Real-time store performance and inventory</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-[13px] font-medium shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <ShoppingCart size={15} />
            <span>Open POS</span>
          </button>
          <button
            onClick={() => onNavigate('products')}
            className="px-3.5 py-2 bg-white hover:bg-[#fafafa] border border-black/[0.08] text-[#1d1d1f] rounded-xl text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </button>
          <button
            onClick={fetchStats}
            title="Refresh"
            className="p-2 bg-white hover:bg-[#fafafa] border border-black/[0.08] text-[#86868b] hover:text-[#1d1d1f] rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Apple Clean KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-white border border-black/[0.06] shadow-sm relative group transition-all hover:shadow">
          <div className="flex items-center justify-between text-[#86868b] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-full bg-[#34c759]/10 text-[#34c759] flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight">
            ₹{stats.todaySales?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[12px] text-[#86868b] mt-1.5 flex items-center gap-1.5">
            <span className="text-[#34c759] font-semibold">{stats.todayTransactions} order(s)</span>
            <span>billed today</span>
          </div>
        </div>

        {/* Transactions Today */}
        <div className="p-5 rounded-2xl bg-white border border-black/[0.06] shadow-sm relative group transition-all hover:shadow">
          <div className="flex items-center justify-between text-[#86868b] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Transactions</span>
            <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight">{stats.todayTransactions}</div>
          <div className="text-[12px] text-[#86868b] mt-1.5">Checkout receipts processed</div>
        </div>

        {/* Total Inventory Units */}
        <div className="p-5 rounded-2xl bg-white border border-black/[0.06] shadow-sm relative group transition-all hover:shadow">
          <div className="flex items-center justify-between text-[#86868b] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Inventory Stock</span>
            <div className="w-8 h-8 rounded-full bg-[#5856d6]/10 text-[#5856d6] flex items-center justify-center">
              <Boxes size={16} />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight">
            {stats.totalInventory?.toLocaleString()} <span className="text-[14px] font-normal text-[#86868b]">units</span>
          </div>
          <div className="text-[12px] text-[#86868b] mt-1.5">Across {stats.totalProducts} catalog products</div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="p-5 rounded-2xl bg-white border border-black/[0.06] shadow-sm relative group transition-all hover:shadow cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#86868b] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stock Alerts</span>
            <div className="w-8 h-8 rounded-full bg-[#ff9500]/10 text-[#ff9500] flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-[#ff9500] tracking-tight">
            {stats.lowStockCount} <span className="text-[14px] font-normal text-[#86868b]">items</span>
          </div>
          <div className="text-[12px] text-[#86868b] mt-1.5 flex items-center gap-1">
            <span>{stats.outOfStockCount} zero stock</span>
            <ArrowUpRight size={13} className="text-[#ff9500]" />
          </div>
        </div>
      </div>

      {/* 7-Day Sales Trend Bar Graph */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">7-Day Sales Trend</h2>
            <p className="text-xs text-slate-500">Daily gross revenue over the past week</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            Past 7 Days
          </span>
        </div>

        <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-slate-100">
          {stats.salesTrend?.map((day: any, i: number) => {
            const maxSale = Math.max(...stats.salesTrend.map((d: any) => d.sales), 1000);
            const heightPct = Math.max(8, Math.round((day.sales / maxSale) * 100));

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap pointer-events-none z-10 shadow-lg">
                  ₹{day.sales.toLocaleString('en-IN')} ({day.count} orders)
                </div>

                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all shadow-sm"
                />
                <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[60px]">{day.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Low Stock Alert Table & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning Table */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Critical Stock Warnings</h2>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Ledger →
              </button>
            </div>

            {stats.lowStockProducts?.length === 0 && stats.outOfStockProducts?.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                🎉 All products are adequately stocked above minimum thresholds!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...(stats.outOfStockProducts || []), ...(stats.lowStockProducts || [])].slice(0, 5).map((p: any) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">Barcode: {p.barcode}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.currentStock <= 0
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                      >
                        {p.currentStock <= 0 ? 'Out of Stock' : `${p.currentStock} ${p.unit} left`}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">Min: {p.minStockThreshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Recent POS Transactions</h2>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Full History →
            </button>
          </div>

          {stats.recentTransactions?.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No sales processed yet today.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentTransactions?.slice(0, 5).map((t: any) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-mono">{t.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Cashier:{' '}
                      {t.cashier?.fullName?.split(' ')[0] || 'Staff'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      ₹{t.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase border border-slate-200">
                      {t.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
