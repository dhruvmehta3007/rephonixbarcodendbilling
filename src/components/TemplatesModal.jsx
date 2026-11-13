import React, { useState } from 'react';
import { 
  X, 
  LayoutTemplate, 
  Check, 
  Smartphone, 
  Tag, 
  Package, 
  ShieldCheck, 
  Layers, 
  BookmarkPlus,
  Trash2
} from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../constants/templates';

export default function TemplatesModal({
  isOpen,
  onClose,
  onApplyTemplate,
  currentLabel,
  currentElements,
}) {
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('rephonix_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  if (!isOpen) return null;

  const handleSaveCurrentAsTemplate = () => {
    if (!newTemplateName.trim()) return;

    const newTpl = {
      id: `custom_${Date.now()}`,
      name: newTemplateName.trim(),
      category: 'User Custom',
      description: `Saved on ${new Date().toLocaleDateString()}`,
      width: currentLabel.width,
      height: currentLabel.height,
      dpi: currentLabel.dpi,
      elements: currentElements,
    };

    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    localStorage.setItem('rephonix_custom_templates', JSON.stringify(updated));
    setNewTemplateName('');
    setShowSaveInput(false);
  };

  const handleDeleteCustom = (id, e) => {
    e.stopPropagation();
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('rephonix_custom_templates', JSON.stringify(updated));
  };

  const getCategoryIcon = (category) => {
    if (category.includes('Mobile')) return <Smartphone size={18} color="#38bdf8" />;
    if (category.includes('Retail')) return <Tag size={18} color="#34d399" />;
    if (category.includes('Logistics') || category.includes('Warehouse')) return <Package size={18} color="#fbbf24" />;
    if (category.includes('Security')) return <ShieldCheck size={18} color="#f472b6" />;
    return <Layers size={18} color="#818cf8" />;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-sm)' }}>
              <LayoutTemplate size={20} color="#3b82f6" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Industrial Label Templates Gallery</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Certified layout templates for Rephonix Mobile IMEI, Retail, Warehouse & Security stickers.
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Action Bar for Saving Custom Template */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Choose an industry template or save your current design for one-click re-use.
          </span>

          <div>
            {!showSaveInput ? (
              <button className="btn btn-secondary" onClick={() => setShowSaveInput(true)}>
                <BookmarkPlus size={15} color="#60a5fa" />
                <span>Save Current as New Template</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Template Name (e.g. My Custom IMEI)"
                  className="input-field"
                  style={{ width: '220px', padding: '5px 10px' }}
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  autoFocus
                />
                <button className="btn btn-primary" onClick={handleSaveCurrentAsTemplate}>
                  Save
                </button>
                <button className="btn btn-secondary" onClick={() => setShowSaveInput(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* Custom Templates Section */}
          {customTemplates.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                onApplyTemplate(t);
                onClose();
              }}
              style={{
                background: 'var(--bg-panel-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookmarkPlus size={18} color="#60a5fa" />
                    <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                      {t.category}
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '3px 6px', color: '#f87171' }}
                    onClick={(e) => handleDeleteCustom(t.id, e)}
                    title="Delete template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  {t.name}
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {t.description}
                </p>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                  {t.width} × {t.height} mm
                </span>
                <span className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11.5px' }}>
                  Load Template
                </span>
              </div>
            </div>
          ))}

          {/* Default Built-in Templates */}
          {DEFAULT_TEMPLATES.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                onApplyTemplate(t);
                onClose();
              }}
              style={{
                background: 'var(--bg-panel-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {getCategoryIcon(t.category)}
                  <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                    {t.category}
                  </span>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  {t.name}
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {t.description}
                </p>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                  {t.width} × {t.height} mm
                </span>
                <span className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11.5px' }}>
                  Load Template
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
