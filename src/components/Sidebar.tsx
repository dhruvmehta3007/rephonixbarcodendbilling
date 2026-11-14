import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Boxes, 
  FolderTree, 
  Receipt, 
  Barcode, 
  Smartphone,
  ScanBarcode,
  Users, 
  Truck, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Store,
  Sparkles
} from 'lucide-react';

export type NavItem = 
  | 'dashboard' 
  | 'scanner'
  | 'pos' 
  | 'products' 
  | 'devices'
  | 'inventory' 
  | 'categories' 
  | 'sales' 
  | 'barcodes' 
  | 'customers' 
  | 'suppliers' 
  | 'reports' 
  | 'users' 
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout }: SidebarProps) {
  const navLinks = [
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner' as NavItem, label: 'Scan & Lookup', icon: ScanBarcode, highlight: true },
    { id: 'pos' as NavItem, label: 'POS Billing', icon: ShoppingCart },
    { id: 'devices' as NavItem, label: 'Device Barcodes', icon: Smartphone },
    { id: 'products' as NavItem, label: 'Products', icon: Package },
    { id: 'inventory' as NavItem, label: 'Inventory & Ledger', icon: Boxes },
    { id: 'categories' as NavItem, label: 'Categories', icon: FolderTree },
    { id: 'sales' as NavItem, label: 'Sales History', icon: Receipt },
    { id: 'barcodes' as NavItem, label: 'Barcode Studio', icon: Barcode },
    { id: 'customers' as NavItem, label: 'Customers', icon: Users },
    { id: 'suppliers' as NavItem, label: 'Suppliers & PO', icon: Truck },
    { id: 'reports' as NavItem, label: 'Reports & P&L', icon: BarChart3, adminOnly: true },
    { id: 'users' as NavItem, label: 'Users & Roles', icon: ShieldCheck, adminOnly: true },
    { id: 'settings' as NavItem, label: 'Shop Settings', icon: Settings, adminOnly: true },
  ];

  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="w-64 bg-[#fbfbfd]/90 backdrop-blur-2xl border-r border-black/[0.08] flex flex-col justify-between flex-shrink-0 h-screen select-none no-print">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-black/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0071e3] flex items-center justify-center text-white font-black text-xl shadow-sm">
            <Barcode size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="font-bold text-[15px] tracking-tight text-[#1d1d1f] flex items-center gap-1.5">
              CellPoint <span className="text-[#0071e3] font-semibold text-[10px] px-2 py-0.5 rounded-full bg-[#0071e3]/10 uppercase tracking-wider">Barcode</span>
            </div>
            <div className="text-[11px] text-[#86868b] font-normal">Smart Retail POS</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)]">
          {navLinks.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[13px] transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50/90 text-blue-700 font-bold border border-blue-200/60 shadow-sm'
                    : item.highlight
                    ? 'text-blue-600 hover:bg-blue-50/70 font-semibold'
                    : 'text-slate-700 hover:bg-black/[0.04] hover:text-slate-950 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'
                  }`}>
                    <Icon size={16} className="stroke-[2.2]" />
                  </div>
                  <span className="tracking-tight">{item.label}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3]">
                    POS
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-black/[0.06] bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#e8e8ed] flex items-center justify-center font-bold text-xs text-[#1d1d1f] uppercase flex-shrink-0">
              {user?.fullName?.[0] || user?.username?.[0] || 'D'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-[#1d1d1f] truncate">{user?.fullName || user?.username || 'Dhruv'}</div>
              <div className="text-[10px] text-[#34c759] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]"></span>
                {user?.role || 'ADMIN'}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-[#86868b] hover:text-[#ff3b30] hover:bg-black/[0.04] transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
