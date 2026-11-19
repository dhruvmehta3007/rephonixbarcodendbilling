import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Edit3, 
  Trash2, 
  Barcode, 
  Check, 
  X, 
  AlertCircle,
  RefreshCw,
  FolderTree,
  Printer,
  Smartphone
} from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../services/api';
import { buildCellPointTSPLJob } from '../utils/tsplBuilder';
import { sendRawToSerialPrinter } from '../utils/webSerial';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [unitItems, setUnitItems] = useState<{ imei: string; customValue: string }[]>([{ imei: '', customValue: '' }]);
  const [savingAndPrinting, setSavingAndPrinting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    description: '',
    categoryId: '',
    supplierId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    customValue: '',
    taxRate: 18,
    currentStock: 1,
    minStockThreshold: 1,
    unit: 'pcs',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);

  useEffect(() => {
    loadProducts();
    loadMetadata();
  }, [search, selectedCategory, stockStatus, sortBy, sortOrder]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.getAll({
        search,
        categoryId: selectedCategory,
        stockStatus,
        sortBy,
        sortOrder,
        limit: '100',
      });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [cats, sups] = await Promise.all([api.categories.getAll(), api.suppliers.getAll()]);
      setCategories(cats || []);
      setSuppliers(sups || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setUnitItems([{ imei: '', customValue: '' }]);
    const defaultCat = categories.find((c) => c.slug === 'smartphones' || c.name.toLowerCase().includes('smart')) || categories[0];
    setFormData({
      name: '',
      barcode: '',
      description: '',
      categoryId: defaultCat?.id || '',
      supplierId: suppliers[0]?.id || '',
      purchasePrice: 0,
      sellingPrice: 0,
      customValue: '',
      taxRate: 18,
      currentStock: 1,
      minStockThreshold: 1,
      unit: 'pcs',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setUnitItems([]);
    setFormData({
      name: p.name,
      barcode: p.barcode || '',
      description: p.description || '',
      categoryId: p.categoryId || '',
      supplierId: p.supplierId || '',
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      customValue: p.customValue || '',
      taxRate: p.taxRate,
      currentStock: p.currentStock,
      minStockThreshold: p.minStockThreshold,
      unit: p.unit || 'pcs',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const addUnitItem = () => {
    // Propose the same buying price code from the previous unit as default
    const prevCode = unitItems[unitItems.length - 1]?.customValue || '';
    setUnitItems((prev) => [...prev, { imei: '', customValue: prevCode }]);
  };

  const updateUnitItem = (idx: number, field: 'imei' | 'customValue', val: string) => {
    setUnitItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const removeUnitItem = (idx: number) => {
    if (unitItems.length <= 1) return;
    setUnitItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const generateRandomImei = (idx: number) => {
    const prefix = '35';
    let randomDigits = '';
    for (let i = 0; i < 13; i++) {
      randomDigits += Math.floor(Math.random() * 10).toString();
    }
    updateUnitItem(idx, 'imei', `${prefix}${randomDigits}`);
  };

  const handleSaveProduct = async (e: React.FormEvent, printLabelImmediately: boolean = false) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (editingProduct) {
        // Collect any additional units added in edit mode
        const cleanAdditionalUnits = unitItems
          .map((u) => ({ imei: u.imei.trim(), customValue: u.customValue.trim() }))
          .filter((u) => Boolean(u.imei));

        const updatedStock = editingProduct.currentStock + cleanAdditionalUnits.length;

        await api.products.update(editingProduct.id, {
          ...formData,
          currentStock: updatedStock,
          units: cleanAdditionalUnits,
        });

        if (printLabelImmediately && cleanAdditionalUnits.length > 0) {
          const itemsToPrint = cleanAdditionalUnits.map((u) => ({
            name: formData.name,
            barcode: u.imei,
            customValue: u.customValue || formData.customValue || '',
            price: formData.sellingPrice || 0,
            quantity: 1,
          }));

          try {
            await api.print.directTSPL({
              printerName: '4BARCODE 4B-2054TG',
              labelSize: '50x25',
              items: itemsToPrint,
            });
          } catch {
            const tsplCode = buildCellPointTSPLJob(itemsToPrint, {
              gapMM: 3,
              labelSize: '50x25',
              widthMM: 50,
              heightMM: 25,
            });
            await sendRawToSerialPrinter(tsplCode, 9600);
          }
        }

        setIsModalOpen(false);
        loadProducts();
      } else {
        const cleanUnits = unitItems
          .map((u) => ({ imei: u.imei.trim(), customValue: u.customValue.trim() }))
          .filter((u) => Boolean(u.imei));

        if (cleanUnits.length === 0) {
          setFormError('Please enter or scan at least one 15-digit IMEI number.');
          return;
        }

        const imeis = cleanUnits.map((u) => u.imei);
        const uniqueImeis = new Set(imeis);
        if (uniqueImeis.size !== imeis.length) {
          setFormError('Duplicate IMEI numbers entered in this intake list. Every device must have a unique IMEI.');
          return;
        }

        const primaryCustomValue = cleanUnits[0]?.customValue || '';

        const payload = {
          ...formData,
          customValue: primaryCustomValue,
          units: cleanUnits,
          imeis,
          barcode: imeis[0],
          currentStock: cleanUnits.length,
        };

        if (printLabelImmediately) {
          setSavingAndPrinting(true);
        }

        await api.products.create(payload);

        if (printLabelImmediately) {
          const itemsToPrint = cleanUnits.map((u) => ({
            name: formData.name,
            barcode: u.imei,
            customValue: u.customValue || '',
            price: formData.sellingPrice || 0,
            quantity: 1,
          }));

          try {
            await api.print.directTSPL({
              printerName: '4BARCODE 4B-2054TG',
              labelSize: '50x25',
              items: itemsToPrint,
            });
          } catch {
            const tsplCode = buildCellPointTSPLJob(itemsToPrint, {
              gapMM: 3,
              labelSize: '50x25',
              widthMM: 50,
              heightMM: 25,
            });
            await sendRawToSerialPrinter(tsplCode, 9600);
          }
        }

        setIsModalOpen(false);
        loadProducts();
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSavingAndPrinting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to archive "${name}"? Historical transactions will remain preserved.`)) {
      try {
        await api.products.delete(id);
        loadProducts();
      } catch (err: any) {
        alert(err.message || 'Failed to archive');
      }
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const csvData = products.map((p) => ({
      Name: p.name,
      Barcode: p.barcode || '',
      Category: p.category?.name || '',
      PurchasePrice: p.purchasePrice,
      SellingPrice: p.sellingPrice,
      TaxRate: p.taxRate,
      Stock: p.currentStock,
      MinThreshold: p.minStockThreshold,
      Unit: p.unit,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the_cell_point_products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Bulk Import
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await api.products.importCsv(results.data);
          setImportSummary(res);
          loadProducts();
        } catch (err: any) {
          alert('CSV Import error: ' + err.message);
        }
      },
    });
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog & Inventory</h1>
          <p className="text-sm text-slate-600 font-medium mt-0.5">Manage mobile devices, IMEI numbers, retail prices and inventory</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#0071e3] hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={14} className="stroke-[2.2]" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="stroke-[2.2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search by device name, IMEI number or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
        >
          <option value="all">All Stock Levels</option>
          <option value="in_stock">In Stock (&gt; Min)</option>
          <option value="low">Low Stock Alerts</option>
          <option value="out">Out of Stock</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
        >
          <option value="name">Sort by Name</option>
          <option value="sellingPrice">Sort by Selling Price</option>
          <option value="currentStock">Sort by Stock</option>
          <option value="createdAt">Sort by Date Added</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-4">PRODUCT & CATEGORY</th>
                <th className="p-4 text-right">COST PRICE</th>
                <th className="p-4 text-right">SELLING PRICE</th>
                <th className="p-4 text-center">TAX (GST)</th>
                <th className="p-4 text-center">STOCK STATUS</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <RefreshCw size={20} className="animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="font-semibold text-xs">Loading products...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
                  const isOut = p.currentStock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5">
                          {p.category?.name || 'Uncategorized'}
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-slate-700 text-xs">
                        ₹{p.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-950 text-sm">
                        ₹{p.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800 text-xs">{p.taxRate}%</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wide border shadow-2xs ${
                            isOut
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {isOut ? 'OUT OF STOCK' : `${p.currentStock} ${p.unit}`}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-xs"
                            title="Edit Product"
                          >
                            <Edit3 size={15} className="stroke-[2.2]" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition-all shadow-xs"
                            title="Archive Product"
                          >
                            <Trash2 size={15} className="stroke-[2.2]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD / EDIT PRODUCT MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-black/[0.08] bg-[#fbfbfd] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
                  <Smartphone size={18} className="text-blue-600" />
                  <span>{editingProduct ? `Edit Device: ${editingProduct.name}` : 'Intake Mobile Device'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingProduct
                    ? 'Update device model details, pricing, and label values'
                    : '1 IMEI = 1 Piece. Stock is derived directly from the registered IMEIs.'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveProduct(e, false)} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Device Name / Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vivo X100 Pro 512GB Asteroid Black"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Purchase / Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Selling / Retail Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-950 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {editingProduct && (
                  <div className="sm:col-span-2 p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Existing Tracked Units In Stock</div>
                      <div className="text-[11px] text-slate-500">Currently {editingProduct.currentStock} unit(s) recorded. You can add more units below with distinct IMEIs.</div>
                    </div>
                    <span className="text-xs font-black text-blue-900 bg-white border border-blue-200 px-3 py-1 rounded-lg">
                      {editingProduct.currentStock} in stock
                    </span>
                  </div>
                )}

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Smartphone size={15} className="text-blue-600" />
                        {editingProduct ? 'Add More Stock (Individual IMEIs / Barcodes)' : 'Device Units & IMEIs (1 IMEI = 1 Piece) *'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {editingProduct 
                          ? 'Each new unit will be assigned its unique IMEI barcode & added to current stock.' 
                          : 'Enter 15-digit IMEI and your secret buying cost code (printed left of MRP on sticker).'}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      {editingProduct 
                        ? `+${unitItems.filter((u) => u.imei.trim()).length} New Piece(s)` 
                        : `${unitItems.filter((u) => u.imei.trim()).length} Unit(s) In Stock`}
                    </span>
                  </div>

                  {unitItems.length === 0 && editingProduct ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                      <p className="text-xs text-slate-600 font-medium mb-2.5">Want to add more inventory stock for this model?</p>
                      <button
                        type="button"
                        onClick={addUnitItem}
                        className="px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>Add New Stock Unit (+1 IMEI)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {unitItems.map((unit, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <span className="text-xs font-mono font-bold text-slate-500 w-6 text-center sm:text-right shrink-0">#{idx + 1}</span>
                          
                          {/* 15-digit IMEI */}
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-tight mb-1 sm:hidden">IMEI Number *</label>
                            <input
                              type="text"
                              required
                              value={unit.imei}
                              onChange={(e) => updateUnitItem(idx, 'imei', e.target.value)}
                              placeholder="Scan or enter 15-digit IMEI *"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Secret Buying Cost Code (Left of MRP) */}
                          <div className="w-full sm:w-56 shrink-0">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-tight mb-1 sm:hidden">Buying Cost Code (Left of MRP)</label>
                            <input
                              type="text"
                              value={unit.customValue}
                              onChange={(e) => updateUnitItem(idx, 'customValue', e.target.value)}
                              placeholder="Cost Code (e.g. KTX9)"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                              title="Your private buying price cipher/code printed on slip next to price"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => generateRandomImei(idx)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap transition-all cursor-pointer shadow-2xs"
                              title="Generate random test IMEI"
                            >
                              Gen IMEI
                            </button>
                            {(unitItems.length > 1 || editingProduct) && (
                              <button
                                type="button"
                                onClick={() => removeUnitItem(idx)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove this unit"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addUnitItem}
                        className="mt-3 px-3.5 py-2 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>Add Another IMEI for this Model</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 -mx-6 -mb-6 mt-6 bg-[#fbfbfd] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                {!editingProduct && (
                  <button
                    type="button"
                    disabled={savingAndPrinting}
                    onClick={(e) => handleSaveProduct(e, true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Printer size={14} />
                    <span>{savingAndPrinting ? 'Printing...' : 'Save & Print Label (TSPL)'}</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingAndPrinting}
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {editingProduct ? 'Save Changes' : 'Save Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CSV BULK IMPORT MODAL ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
                <Upload size={18} className="text-blue-400" />
                <span>Bulk Import Products from CSV</span>
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#86868b]">
              Upload a CSV file containing columns: <code className="text-blue-400">name, sku, price, cost, stock, barcode</code>. Opening inventory entries will be automatically generated.
            </p>

            <label className="border-2 border-dashed border-black/[0.08] hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#f5f5f7]">
              <Upload size={32} className="text-blue-400 mb-2" />
              <span className="text-xs font-semibold text-[#1d1d1f]">Click to select CSV spreadsheet</span>
              <span className="text-[11px] text-[#86868b] mt-1">.csv format exported from Excel / ERP</span>
              <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
            </label>

            {importSummary && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="font-bold">✓ Successfully imported {importSummary.importedCount} products!</div>
                {importSummary.errors?.length > 0 && (
                  <div className="text-[11px] text-amber-400 mt-1">
                    Warnings:
                    <ul className="list-disc pl-4 space-y-0.5">
                      {importSummary.errors.slice(0, 3).map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportSummary(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
