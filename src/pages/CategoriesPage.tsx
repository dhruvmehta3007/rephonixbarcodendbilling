import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit3, Trash2, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.categories.getAll();
      setCategories(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, { name, description });
      } else {
        await api.categories.create({ name, description });
      }
      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete category "${name}"?`)) {
      try {
        await api.categories.delete(id);
        loadCategories();
      } catch (err: any) {
        alert(err.message || 'Failed to delete');
      }
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Product Categories</h1>
          <p className="text-sm text-[#86868b]">Organize catalog items into departments and classifications</p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setName('');
            setDescription('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="p-5 rounded-2xl bg-white border border-black/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-blue-400 font-bold">/{c.slug}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-[#1d1d1f]">
                  {c._count?.products || 0} Products
                </span>
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] mb-1">{c.name}</h3>
              <p className="text-xs text-[#86868b] line-clamp-2">{c.description || 'No description provided.'}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-black/[0.08] flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditingCategory(c);
                  setName(c.name);
                  setDescription(c.description || '');
                  setIsModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-[#1d1d1f] hover:text-[#1d1d1f]"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                className="p-1.5 rounded-lg bg-slate-800 text-[#86868b] hover:text-rose-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
              <h3 className="text-base font-bold text-[#1d1d1f]">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-[#1d1d1f] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
