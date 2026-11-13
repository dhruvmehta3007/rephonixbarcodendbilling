import React from 'react';
import { 
  Printer, 
  FileCode, 
  Database, 
  LayoutTemplate, 
  Undo2, 
  Redo2, 
  Download, 
  Upload, 
  Layers, 
  Sliders,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function Header({
  label,
  setLabel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenTemplates,
  onOpenBatch,
  onOpenZpl,
  onOpenPrint,
  onExportJson,
  onImportJson,
  selectedPreset,
  setSelectedPreset,
  sampleDataCount,
}) {
  const quickSizes = [
    { label: 'Mobile IMEI (50x30 mm)', w: 50, h: 30 },
    { label: 'Retail Tag (50x25 mm)', w: 50, h: 25 },
    { label: 'Shipping Box (100x150 mm)', w: 100, h: 150 },
    { label: 'Warranty Seal (40x15 mm)', w: 40, h: 15 },
    { label: '2-Up Dual (80x25 mm)', w: 80, h: 25 },
    { label: 'Square Sticker (40x40 mm)', w: 40, h: 40 },
  ];

  const handleSizeChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(val);
    const found = quickSizes.find((s) => s.label === val);
    if (found) {
      setLabel((prev) => ({
        ...prev,
        width: found.w,
        height: found.h,
      }));
    }
  };

  return (
    <header className="app-header">
      {/* Brand & Identity */}
      <div className="brand-section">
        <div className="brand-logo-badge">
          <div className="brand-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8v8M10 8v8M14 8v8M18 8v8" />
            </svg>
          </div>
          <span style={{ letterSpacing: '-0.3px' }}>
            CellPoint <span style={{ color: '#60a5fa', fontWeight: 600 }}>Barcode</span>
          </span>
        </div>
        <span className="brand-badge">Enterprise v2.4</span>
      </div>

      {/* Center Label Dimensions & Quick Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SIZE:</span>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '3px 8px', fontSize: '12px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            value={selectedPreset}
            onChange={handleSizeChange}
          >
            {quickSizes.map((s) => (
              <option key={s.label} value={s.label} style={{ background: '#131b2e' }}>
                {s.label}
              </option>
            ))}
            <option value="custom" style={{ background: '#131b2e' }}>Custom Size...</option>
          </select>
          <span style={{ fontSize: '11.5px', color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {label.width} × {label.height} mm
          </span>
        </div>

        {/* DPI Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>DPI:</span>
          <select
            className="input-field"
            style={{ width: 'auto', padding: '3px 6px', fontSize: '12px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            value={label.dpi || 203}
            onChange={(e) => setLabel((p) => ({ ...p, dpi: Number(e.target.value) }))}
          >
            <option value={203} style={{ background: '#131b2e' }}>203 DPI (Standard)</option>
            <option value={300} style={{ background: '#131b2e' }}>300 DPI (High-Res)</option>
            <option value={600} style={{ background: '#131b2e' }}>600 DPI (Micro)</option>
          </select>
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-app)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', border: 'none' }}
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} style={{ opacity: canUndo ? 1 : 0.4 }} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', border: 'none' }}
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} style={{ opacity: canRedo ? 1 : 0.4 }} />
          </button>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="btn btn-secondary" onClick={onOpenTemplates} title="Browse Pre-built Label Templates">
          <LayoutTemplate size={15} color="#60a5fa" />
          <span>Templates</span>
        </button>

        <button className="btn btn-secondary" onClick={onOpenBatch} title="Import CSV or Generate Serial Numbers">
          <Database size={15} color="#10b981" />
          <span>Batch Data {sampleDataCount > 0 && `(${sampleDataCount})`}</span>
        </button>

        <button className="btn btn-secondary" onClick={onOpenZpl} title="Zebra ZPL II & TSC TSPL Machine Code">
          <FileCode size={15} color="#f59e0b" />
          <span>ZPL / TSPL</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenPrint} title="Direct Browser Thermal Print">
          <Printer size={16} />
          <span style={{ fontWeight: 600 }}>Print Label</span>
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Save/Export */}
        <button className="btn btn-secondary" style={{ padding: '6px 9px' }} onClick={onExportJson} title="Export Template JSON">
          <Download size={15} />
        </button>
        <label className="btn btn-secondary" style={{ padding: '6px 9px', cursor: 'pointer' }} title="Import Template JSON">
          <Upload size={15} />
          <input type="file" accept=".json,.rephonix" style={{ display: 'none' }} onChange={onImportJson} />
        </label>
      </div>
    </header>
  );
}
