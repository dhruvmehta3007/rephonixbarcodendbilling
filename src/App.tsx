import React, { useState, useEffect } from 'react';
import Sidebar, { NavItem } from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import ProductsPage from './pages/ProductsPage';
import DevicesPage from './pages/DevicesPage';
import InventoryPage from './pages/InventoryPage';
import CategoriesPage from './pages/CategoriesPage';
import SalesPage from './pages/SalesPage';
import BarcodePage from './pages/BarcodePage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ScannerPage from './pages/ScannerPage';
import PartnerPortal from './pages/PartnerPortal';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('rephonix_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [shopConfig, setShopConfig] = useState<any>(null);

  const loadShopConfig = async () => {
    try {
      const status = await api.partner.getStatus();
      if (status) {
        setShopConfig(status);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadShopConfig();
  }, []);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('rephonix_token');
    if (token) {
      api.auth
        .getMe()
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('rephonix_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, []);

  const handleLoginSuccess = (userData: any, token: string) => {
    setUser(userData);
    if (userData?.role === 'PARTNER') {
      setCurrentTab('partner');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    localStorage.removeItem('rephonix_token');
    localStorage.removeItem('rephonix_user');
    setUser(null);
  };

  // If not logged in, render the clean login interface
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in as PARTNER, render ONLY the dedicated Partner Console with a top logout bar
  if (user?.role === 'PARTNER') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-900 font-sans antialiased">
        {/* Top Partner Navigation Bar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center p-1 overflow-hidden shadow-sm">
              <img src="/rephonix-logo.png" alt="Rephonix" className="w-full h-full object-contain filter brightness-0 invert" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-slate-900 flex items-center gap-2">
                Rephonix <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Partner Master Console</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Software Licensing & Client Deployment Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{user?.fullName || 'Partner Admin'}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-rose-200 flex items-center gap-1.5"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Partner Portal Body */}
        <main className="flex-1 overflow-y-auto">
          <PartnerPortal onConfigUpdated={loadShopConfig} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#0071e3] selection:text-white">
      {/* Persistent Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        shopConfig={shopConfig}
      />

      {/* Main Dynamic Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f5f5f7]">
        {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
        {currentTab === 'scanner' && <ScannerPage onNavigate={setCurrentTab} />}
        {currentTab === 'pos' && <PosPage />}
        {currentTab === 'devices' && <DevicesPage />}
        {currentTab === 'products' && <ProductsPage />}
        {currentTab === 'inventory' && <InventoryPage />}
        {currentTab === 'categories' && <CategoriesPage />}
        {currentTab === 'sales' && <SalesPage />}
        {currentTab === 'barcodes' && <BarcodePage />}
        {currentTab === 'users' && <UsersPage />}
        {currentTab === 'settings' && <SettingsPage />}
        {currentTab === 'partner' && <PartnerPortal onConfigUpdated={loadShopConfig} />}
      </main>
    </div>
  );
}
