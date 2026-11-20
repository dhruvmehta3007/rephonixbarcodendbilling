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
  Sparkles,
  ShieldAlert
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
  | 'users' 
  | 'settings'
  | 'partner';

interface SidebarProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  user: any;
  onLogout: () => void;
  shopConfig?: any;
}

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout, shopConfig }: SidebarProps) {
  const allNavLinks = [
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: LayoutDashboard, enabled: true },
    { id: 'scanner' as NavItem, label: 'Scan & Lookup', icon: ScanBarcode, highlight: true, enabled: shopConfig?.moduleDevices !== false || shopConfig?.moduleBarcodes !== false },
    { id: 'barcodes' as NavItem, label: 'Barcode Studio', icon: Barcode, enabled: shopConfig?.moduleBarcodes !== false },
    { id: 'devices' as NavItem, label: 'Device Barcodes', icon: Smartphone, enabled: shopConfig?.moduleDevices !== false },
    { id: 'pos' as NavItem, label: 'POS Billing', icon: ShoppingCart, enabled: shopConfig?.modulePos !== false },
    { id: 'products' as NavItem, label: 'Products', icon: Package, enabled: shopConfig?.moduleProducts !== false },
    { id: 'inventory' as NavItem, label: 'Inventory & Ledger', icon: Boxes, enabled: shopConfig?.moduleInventory !== false },
    { id: 'categories' as NavItem, label: 'Categories', icon: FolderTree, enabled: shopConfig?.moduleCategories !== false },
    { id: 'sales' as NavItem, label: 'Sales History', icon: Receipt, enabled: shopConfig?.moduleSales !== false },
    { id: 'users' as NavItem, label: 'Users & Roles', icon: ShieldCheck, adminOnly: true, enabled: true },
    { id: 'settings' as NavItem, label: 'Store Settings', icon: Settings, adminOnly: true, enabled: true },
  ];

  const navLinks = allNavLinks.filter((item) => item.enabled);

  const isPartner = user?.role === 'PARTNER';
  const isAdmin = user?.role === 'ADMIN' || isPartner;

  return (
    <aside className="w-64 bg-[#fbfbfd]/90 backdrop-blur-2xl border-r border-black/[0.08] flex flex-col justify-between flex-shrink-0 h-screen select-none no-print">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
              <img src="/rephonix-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="overflow-hidden">
              <div className="font-extrabold text-[15px] tracking-tight text-slate-900 truncate" title={shopConfig?.shopName || 'Rephonix'}>
                {shopConfig?.shopName || 'Rephonix'}
              </div>
              <div className="text-[11px] text-[#86868b] font-normal truncate">Smart POS & Barcode</div>
            </div>
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
                {user?.role === 'PARTNER' ? 'PARTNER' : user?.role === 'ADMIN' ? 'SHOP OWNER' : 'CASHIER'}
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
