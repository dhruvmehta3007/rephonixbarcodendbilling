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
    setCurrentTab('dashboard');
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#0071e3] selection:text-white">
      {/* Persistent Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
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
      </main>
    </div>
  );
}
