import React, { useState, useEffect } from 'react';
import { 
  KeyRound, ShieldCheck, Store, Layers, Lock, CheckCircle2, 
  AlertCircle, RefreshCw, Smartphone, ShoppingCart, Package, 
  Boxes, FolderTree, Receipt, Barcode, FileText, Users, Truck
} from 'lucide-react';
import { api } from '../services/api';

interface PartnerPortalProps {
  onConfigUpdated?: () => void;
}

export default function PartnerPortal({ onConfigUpdated }: PartnerPortalProps) {
  const [pin, setPin] = useState('9876');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [config, setConfig] = useState({
    shopName: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    currencySymbol: '₹',
    receiptFooter: '',
    modulePos: true,
    moduleDevices: true,
    moduleProducts: true,
    moduleInventory: true,
    moduleCategories: true,
    moduleSales: true,
    moduleBarcodes: true,
    moduleReports: true,
    moduleCustomers: true,
    moduleSuppliers: true,
    newPin: '',
    ownerUsername: '',
    ownerFullName: '',
    ownerPassword: '',
  });

  const loadCurrentStatus = async () => {
    try {
      const res = await api.partner.getStatus();
      if (res) {
        setConfig((prev) => ({
          ...prev,
          shopName: res.shopName || '',
          address: res.address || '',
          phone: res.phone || '',
          email: res.email || '',
          gstin: res.gstin || '',
          currencySymbol: res.currencySymbol || '₹',
          receiptFooter: res.receiptFooter || '',
          modulePos: res.modulePos !== false,
          moduleDevices: res.moduleDevices !== false,
          moduleProducts: res.moduleProducts !== false,
          moduleInventory: res.moduleInventory !== false,
          moduleCategories: res.moduleCategories !== false,
          moduleSales: res.moduleSales !== false,
          moduleBarcodes: res.moduleBarcodes !== false,
          moduleReports: res.moduleReports !== false,
          moduleCustomers: res.moduleCustomers !== false,
          moduleSuppliers: res.moduleSuppliers !== false,
          ownerUsername: res.ownerUsername || '',
          ownerFullName: res.ownerFullName || '',
        }));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCurrentStatus();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      const res = await api.partner.verifyPin(pin);
      if (res?.authorized) {
        setIsAuthorized(true);
        if (res.settings) {
          setConfig((prev) => ({
            ...prev,
            ...res.settings,
            newPin: '',
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Master PIN. Default is 9876');
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleModule = (key: keyof typeof config) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.partner.updateConfig({
        ...config,
        pin,
      });
      setSuccessMsg('Partner configuration and shop owner credentials updated successfully!');
      alert('Success! Shop owner credentials and module settings have been saved successfully.');
      if (config.newPin && config.newPin.trim().length >= 4) {
        setPin(config.newPin.trim());
        setConfig((prev) => ({ ...prev, newPin: '' }));
      }
      if (config.ownerPassword) {
        setConfig((prev) => ({ ...prev, ownerPassword: '' }));
      }
      if (onConfigUpdated) {
        onConfigUpdated();
      }
      // Reload current status to refresh form with saved state
      await loadCurrentStatus();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update partner config');
      alert('Error: ' + (err.message || 'Failed to save configuration'));
    } finally {
      setSaving(false);
    }
  };

  // 1. PIN Lock Screen
  if (!isAuthorized) {
    return (
      <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center min-h-[500px]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mx-auto ring-8 ring-indigo-50">
            <ShieldCheck size={32} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Partner Master Access</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your secret Master PIN to edit client shop branding, project name & toggle payable modules.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 text-left">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                required
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Master PIN (Default: 9876)"
                className="w-full text-center text-xl tracking-widest font-mono py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {verifying ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
              <span>Unlock Partner Portal</span>
            </button>
          </form>

          <div className="text-[11px] text-slate-400">
            Authorized only for Garvit Madan & Partners
          </div>
        </div>
      </div>
    );
  }

  // 2. Unlocked Partner Dashboard
  const modulesList = [
    { key: 'moduleBarcodes', label: 'Barcode Studio & Printing', desc: 'Custom thermal sticker generator & TSPL zero-dialog direct printing', icon: Barcode },
    { key: 'moduleDevices', label: 'Tracked Device Units & IMEI', desc: 'Unique IMEI1/IMEI2/Serial barcode tracking for mobile shops', icon: Smartphone },
    { key: 'modulePos', label: 'POS Billing & Quick Checkout', desc: 'Retail counter billing, barcode cart, and thermal receipts', icon: ShoppingCart },
    { key: 'moduleProducts', label: 'Products & Catalog', desc: 'Product inventory catalog with pricing and stock units', icon: Package },
    { key: 'moduleInventory', label: 'Inventory & Stock Ledger', desc: 'Stock movements, replenishment logs, and low-stock alerts', icon: Boxes },
    { key: 'moduleCategories', label: 'Category Hierarchy', desc: 'Product category taxonomy and brand tags', icon: FolderTree },
    { key: 'moduleSales', label: 'Sales History & Invoices', desc: 'Invoice logs, transaction lookup, and refunds', icon: Receipt },
    { key: 'moduleCustomers', label: 'Customer Directory', desc: 'Customer phone records, billing history & ledger', icon: Users },
    { key: 'moduleSuppliers', label: 'Supplier & Purchase Orders', desc: 'Vendor directory and incoming stock shipments', icon: Truck },
    { key: 'moduleReports', label: 'Reports & Revenue Analytics', desc: 'Profit & loss valuation and daily sales reporting', icon: FileText },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider">
              Exclusive Partner Console
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Project Branding & Module Licensing</h1>
          <p className="text-sm text-slate-500">
            Configure client details for this installation. Activate or deactivate modules based on what the client purchased.
          </p>
        </div>

        <button
          onClick={() => setIsAuthorized(false)}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Lock Console
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 font-medium">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Section 1: Client Store Branding */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Store size={20} className="text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Client Shop Details & White-Label Name</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Client Shop / Business Name *</label>
              <input
                type="text"
                required
                value={config.shopName}
                onChange={(e) => setConfig({ ...config, shopName: e.target.value })}
                placeholder="e.g. Royal Mobiles / Rephonix"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Appears on invoices, POS header, and barcode tags</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                placeholder="e.g. shop@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={config.gstin}
                onChange={(e) => setConfig({ ...config, gstin: e.target.value })}
                placeholder="e.g. 07AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white uppercase font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Physical Store Address</label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                placeholder="Shop Address for bills"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Receipt Footer Note</label>
              <input
                type="text"
                value={config.receiptFooter}
                onChange={(e) => setConfig({ ...config, receiptFooter: e.target.value })}
                placeholder="Thank you for shopping! 7-day replacement warranty."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payable Feature & Module Toggles */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Layers size={20} className="text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Module Access & Feature Licensing</h2>
                <p className="text-xs text-slate-500">Only enabled panels will be visible to this client.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    modulePos: true,
                    moduleDevices: true,
                    moduleProducts: true,
                    moduleInventory: true,
                    moduleCategories: true,
                    moduleSales: true,
                    moduleBarcodes: true,
                    moduleReports: true,
                    moduleCustomers: true,
                    moduleSuppliers: true,
                  }));
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                Enable All (Enterprise)
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    moduleBarcodes: true,
                    moduleDevices: true,
                    modulePos: false,
                    moduleProducts: true,
                    moduleInventory: false,
                    moduleCategories: false,
                    moduleSales: false,
                    moduleReports: false,
                    moduleCustomers: false,
                    moduleSuppliers: false,
                  }));
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Barcode-Only Tier
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {modulesList.map((mod) => {
              const isEnabled = (config as any)[mod.key];
              const Icon = mod.icon;

              return (
                <div
                  key={mod.key}
                  onClick={() => handleToggleModule(mod.key as any)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isEnabled
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{mod.label}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">{mod.desc}</div>
                    </div>
                  </div>

                  <div className="ml-3 flex-shrink-0">
                    <div className={`w-11 h-6 rounded-full transition-colors p-0.5 ${isEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Shopowner Admin Credentials */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <Users size={20} className="text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Shop Owner Admin Credentials</h2>
              <p className="text-xs text-slate-500">Configure login credentials specifically for this client/shop owner</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Owner Full Name</label>
              <input
                type="text"
                value={config.ownerFullName}
                onChange={(e) => setConfig({ ...config, ownerFullName: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Owner Username (For Login)</label>
              <input
                type="text"
                value={config.ownerUsername}
                onChange={(e) => setConfig({ ...config, ownerUsername: e.target.value })}
                placeholder="e.g. rajesh"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Owner New Password</label>
              <input
                type="password"
                value={config.ownerPassword}
                onChange={(e) => setConfig({ ...config, ownerPassword: e.target.value })}
                placeholder="Leave blank to keep existing"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-400 block">The shop owner will log in with these credentials. They cannot access this Partner Portal without your Master PIN.</span>
        </div>

        {/* Section 4: Master PIN Change (Optional) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <KeyRound size={20} className="text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Change Master Partner PIN (Optional)</h2>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-600 mb-1">New Secret Master PIN</label>
            <input
              type="password"
              value={config.newPin}
              onChange={(e) => setConfig({ ...config, newPin: e.target.value })}
              placeholder="Leave blank to keep current PIN"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">Only you and your partner should know this PIN.</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            <span>Save & Apply Project Setup</span>
          </button>
        </div>
      </form>
    </div>
  );
}
