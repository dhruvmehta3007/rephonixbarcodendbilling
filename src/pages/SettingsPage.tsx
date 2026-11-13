import React, { useState, useEffect } from 'react';
import { Settings, Save, Printer, Store, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    shopName: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    currencySymbol: '₹',
    taxRateDefault: 18,
    receiptFooter: '',
    allowNegativeStock: false,
  });
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.settings.get();
      if (res) setFormData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    setErrorMsg(null);
    try {
      await api.settings.update(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Store Profile & Hardware Configuration</h1>
        <p className="text-sm text-[#86868b]">Configure business identity, GST tax rules, and receipt printer defaults</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white border border-black/[0.08] space-y-4">
            <h2 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2 mb-4">
              <Store size={18} className="text-blue-400" />
              <span>Store Details & Invoicing Profile</span>
            </h2>

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>Shop settings successfully saved!</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Store / Legal Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Store Address (Appears on Invoices) *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Store Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Billing Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Receipt Footer Note / Return Policy</label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-black/[0.08]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowNegativeStock}
                    onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded bg-[#f5f5f7] border-black/[0.08]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1d1d1f]">Allow Negative Stock at Checkout</span>
                    <p className="text-[11px] text-[#86868b]">
                      When disabled, cashier cannot complete a sale if physical inventory is 0.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-black/[0.08]">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2"
              >
                <Save size={15} />
                <span>Save Store Configurations</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Printer Integration Architecture Documentation */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-black/[0.08] space-y-3">
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
              <Printer size={16} className="text-emerald-400" />
              <span>Printer Integration Guide</span>
            </h3>
            <p className="text-xs text-[#1d1d1f] leading-relaxed">
              Rephonix ShopMaster supports two independent printer pipelines:
            </p>

            <div className="space-y-2 text-xs text-[#86868b]">
              <div className="p-3 rounded-xl bg-[#f5f5f7] border border-black/[0.08]">
                <div className="font-bold text-[#1d1d1f] mb-0.5">1. Thermal Receipt Printer (58mm / 80mm)</div>
                <div>Standard ESC/POS thermal receipt printers (Epson, TVS, Citizen, Xprinter). Uses native driver print dialog calibrated with zero margins.</div>
              </div>

              <div className="p-3 rounded-xl bg-[#f5f5f7] border border-black/[0.08]">
                <div className="font-bold text-[#1d1d1f] mb-0.5">2. Thermal Barcode Label Printer</div>
                <div>Zebra (ZPL II), TSC/TVS (TSPL). Supports direct browser printing via vector SVG, plus raw machine code dispatch via WebSerial/USB port!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
