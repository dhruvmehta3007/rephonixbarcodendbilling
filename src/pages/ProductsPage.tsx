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
  FolderTree
} from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../services/api';

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
    currentStock: 0,
    minStockThreshold: 5,
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
    setFormData({
      name: '',
      barcode: `890${Date.now().toString().slice(-9)}`,
      description: '',
      categoryId: categories[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      purchasePrice: 100,
      sellingPrice: 199,
      customValue: '',
      taxRate: 18,
      currentStock: 10,
      minStockThreshold: 5,
      unit: 'pcs',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, formData);
      } else {
        await api.products.create(formData);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
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
    a.download = `cellpoint_products_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Product Catalog & Inventory</h1>
          <p className="text-sm text-[#86868b]">Manage unique barcodes, retail prices and stock thresholds</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-[#f5f5f7] hover:bg-[#1e2d4d] border border-black/[0.08] text-[#1d1d1f] rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Upload size={15} />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-[#f5f5f7] hover:bg-[#1e2d4d] border border-black/[0.08] text-[#1d1d1f] rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-black/[0.08] flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868b]">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search by product name or unique barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
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
          className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
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
          className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="sellingPrice">Sort by Selling Price</option>
          <option value="currentStock">Sort by Stock</option>
          <option value="createdAt">Sort by Date Added</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
              <tr>
                <th className="p-4">PRODUCT & CATEGORY</th>
                <th className="p-4">BARCODE (PRIMARY ID)</th>
                <th className="p-4 text-right">COST PRICE</th>
                <th className="p-4 text-right">SELLING PRICE</th>
                <th className="p-4 text-center">TAX (GST)</th>
                <th className="p-4 text-center">STOCK STATUS</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#86868b]">
                    <RefreshCw size={20} className="animate-spin mx-auto text-blue-500 mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-[#86868b]">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
                  const isOut = p.currentStock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#f5f5f7] transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-[#1d1d1f] text-sm">{p.name}</div>
                        <div className="text-[11px] text-[#86868b] mt-0.5">
                          {p.category?.name || 'Uncategorized'}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-blue-400">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Barcode size={16} className="text-blue-400" />
                          {p.barcode}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-[#86868b]">
                        ₹{p.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400">
                        ₹{p.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center font-mono">{p.taxRate}%</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : `${p.currentStock} ${p.unit}`}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 transition-all shadow-sm"
                            title="Edit Product"
                          >
                            <Edit3 size={15} className="stroke-[2.2]" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition-all shadow-sm"
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
              <h3 className="text-base font-bold text-[#1d1d1f]">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Catalog Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Product Title / Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Barcode (Unique Identifier) *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Leave blank to auto-generate unique barcode"
                      className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, barcode: `890${Date.now().toString().slice(-9)}` })}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 whitespace-nowrap"
                    >
                      Gen EAN
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Purchase / Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Selling / Retail Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Label Value (Left of MRP)</label>
                  <input
                    type="text"
                    value={formData.customValue}
                    onChange={(e) => setFormData({ ...formData, customValue: e.target.value })}
                    placeholder="e.g. Tag, Code or Value"
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Tax Rate (% GST)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Min. Stock Alert Threshold</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-black/[0.08] -mx-6 -mb-6 mt-6 bg-[#fbfbfd] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#283852] text-[#1d1d1f] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
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
