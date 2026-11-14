import React, { useState } from 'react';
import { 
  Sliders, 
  Layers, 
  Settings, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ArrowUp, 
  ArrowDown, 
  Move,
  CornerDownRight,
  Maximize,
  RotateCw
} from 'lucide-react';
import { BARCODE_TYPES } from '../utils/barcodeGenerator';
import { PRINTER_CONFIG, DOTS_PER_MM } from '../constants/printerConfig';

export default function PropertiesPanel({
  label,
  setLabel,
  elements,
  selectedId,
  setSelectedId,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  snapGrid,
  setSnapGrid,
}) {
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'layers' | 'label'

  const selectedEl = elements.find((e) => e.id === selectedId);

  // Alignment helpers
  const handleAlign = (type) => {
    if (!selectedEl) return;
    switch (type) {
      case 'left':
        onUpdateElement(selectedId, { x: 0 });
        break;
      case 'centerH':
        onUpdateElement(selectedId, {
          x: Number(((label.width - selectedEl.width) / 2).toFixed(1)),
        });
        break;
      case 'right':
        onUpdateElement(selectedId, {
          x: Number((label.width - selectedEl.width).toFixed(1)),
        });
        break;
      case 'top':
        onUpdateElement(selectedId, { y: 0 });
        break;
      case 'centerV':
        onUpdateElement(selectedId, {
          y: Number(((label.height - selectedEl.height) / 2).toFixed(1)),
        });
        break;
      case 'bottom':
        onUpdateElement(selectedId, {
          y: Number((label.height - selectedEl.height).toFixed(1)),
        });
        break;
    }
  };

  const insertVariable = (varName) => {
    if (!selectedEl) return;
    const current = selectedEl.content || '';
    onUpdateElement(selectedId, { content: current + `{{${varName}}}` });
  };

  return (
    <aside className="right-sidebar">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)' }}>
        <button
          onClick={() => setActiveTab('properties')}
          style={{
            flex: 1,
            padding: '10px 4px',
            background: activeTab === 'properties' ? 'var(--bg-panel-elevated)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'properties' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'properties' ? '#f8fafc' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Sliders size={14} />
          <span>Properties</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          style={{
            flex: 1,
            padding: '10px 4px',
            background: activeTab === 'layers' ? 'var(--bg-panel-elevated)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'layers' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'layers' ? '#f8fafc' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Layers size={14} />
          <span>Layers ({elements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('label')}
          style={{
            flex: 1,
            padding: '10px 4px',
            background: activeTab === 'label' ? 'var(--bg-panel-elevated)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'label' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'label' ? '#f8fafc' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Settings size={14} />
          <span>Setup</span>
        </button>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* ================= PROPERTIES TAB ================= */}
        {activeTab === 'properties' && (
          <div>
            {selectedEl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Element Type Header & Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {selectedEl.type} ELEMENT
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      ID: {selectedEl.id.replace('el_', '')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px' }}
                      onClick={() => onDuplicateElement(selectedEl.id)}
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px', color: '#f87171' }}
                      onClick={() => onDeleteElement(selectedEl.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Geometric Transform (X, Y, W, H) */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TRANSFORM (MM)</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        X (mm) • {Math.round(selectedEl.x * 8)} dots
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={Math.max(0, label.width - selectedEl.width)}
                        className="input-field"
                        value={selectedEl.x}
                        onChange={(e) => onUpdateElement(selectedId, { x: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Y (mm) • {Math.round(selectedEl.y * 8)} dots
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={Math.max(0, label.height - selectedEl.height)}
                        className="input-field"
                        value={selectedEl.y}
                        onChange={(e) => onUpdateElement(selectedId, { y: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Width (mm) • {Math.round(selectedEl.width * 8)} dots
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max={Math.max(1, label.width - selectedEl.x)}
                        className="input-field"
                        value={selectedEl.width}
                        onChange={(e) => onUpdateElement(selectedId, { width: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Height (mm) • {Math.round(selectedEl.height * 8)} dots
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max={Math.max(1, label.height - selectedEl.y)}
                        className="input-field"
                        value={selectedEl.height}
                        onChange={(e) => onUpdateElement(selectedId, { height: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                    Boundary: [0, 0] to [{Math.round(label.width * 8)}, {Math.round(label.height * 8)}] dots ({label.width} × {label.height} mm)
                  </div>
                </div>

                {/* Alignment Tools */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ALIGN ON CANVAS</span>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '5px' }} onClick={() => handleAlign('left')} title="Align Left">
                      <AlignLeft size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '5px' }} onClick={() => handleAlign('centerH')} title="Center Horizontally">
                      <AlignCenter size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '5px' }} onClick={() => handleAlign('right')} title="Align Right">
                      <AlignRight size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '5px' }} onClick={() => handleAlign('top')} title="Align Top">
                      <ArrowUp size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '5px' }} onClick={() => handleAlign('centerV')} title="Center Vertically">
                      <Move size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '5px' }} onClick={() => handleAlign('bottom')} title="Align Bottom">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Specific to Text */}
                {selectedEl.type === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TEXT CONTENT</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        style={{ marginTop: '4px', resize: 'vertical' }}
                        value={selectedEl.content || ''}
                        onChange={(e) => onUpdateElement(selectedId, { content: e.target.value })}
                      />
                    </div>

                    {/* Quick Variable Insert */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Insert Variable:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {['imei1', 'imei2', 'serial', 'model', 'price', 'mrp'].map((v) => (
                          <button
                            key={v}
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => insertVariable(v)}
                          >
                            +{v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Typography controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Font Size</label>
                        <input
                          type="number"
                          step="0.5"
                          className="input-field"
                          value={selectedEl.fontSize || 8}
                          onChange={(e) => onUpdateElement(selectedId, { fontSize: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Weight</label>
                        <select
                          className="input-field"
                          value={selectedEl.fontWeight || 'normal'}
                          onChange={(e) => onUpdateElement(selectedId, { fontWeight: e.target.value })}
                        >
                          <option value="normal">Regular</option>
                          <option value="500">Medium</option>
                          <option value="600">Semi-Bold</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Font Family</label>
                      <select
                        className="input-field"
                        value={selectedEl.fontFamily || 'Inter'}
                        onChange={(e) => onUpdateElement(selectedId, { fontFamily: e.target.value })}
                      >
                        <option value="Inter">Inter (Clean UI)</option>
                        <option value="JetBrains Mono">JetBrains Mono (Serial / IMEI)</option>
                        <option value="Outfit">Outfit (Display Header)</option>
                        <option value="Arial">Arial (Standard)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Text Align</label>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            className={`btn ${selectedEl.textAlign === align ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '4px', textTransform: 'capitalize', fontSize: '11px' }}
                            onClick={() => onUpdateElement(selectedId, { textAlign: align })}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific to Barcode */}
                {selectedEl.type === 'barcode' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BARCODE DATA / VARIABLE</label>
                      <input
                        type="text"
                        className="input-field"
                        style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }}
                        value={selectedEl.content || ''}
                        onChange={(e) => onUpdateElement(selectedId, { content: e.target.value })}
                      />
                    </div>

                    {/* Quick Variable Insert */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Bind to Variable:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {['imei1', 'imei2', 'barcode', 'serial'].map((v) => (
                          <button
                            key={v}
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => onUpdateElement(selectedId, { content: `{{${v}}}` })}
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Symbology Standard</label>
                      <select
                        className="input-field"
                        value={selectedEl.symbology || 'code128'}
                        onChange={(e) => onUpdateElement(selectedId, { symbology: e.target.value })}
                      >
                        {BARCODE_TYPES.filter((t) => t.category === '1d').map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Show Text Under Barcode</span>
                      <input
                        type="checkbox"
                        checked={!!selectedEl.showText}
                        onChange={(e) => onUpdateElement(selectedId, { showText: e.target.checked })}
                      />
                    </div>
                  </div>
                )}

                {/* Specific to 2D Code (QR / DataMatrix) */}
                {['qrcode', 'datamatrix', 'pdf417'].includes(selectedEl.type) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>2D PAYLOAD / DATA</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }}
                        value={selectedEl.content || ''}
                        onChange={(e) => onUpdateElement(selectedId, { content: e.target.value })}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Insert Variable:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {['imei1', 'serial', 'tracking_no'].map((v) => (
                          <button
                            key={v}
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => insertVariable(v)}
                          >
                            +{v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific to Rect / Line / Badge */}
                {['rect', 'line', 'badge'].includes(selectedEl.type) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedEl.type === 'badge' && (
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>BADGE TEXT</label>
                        <input
                          type="text"
                          className="input-field"
                          value={selectedEl.content || ''}
                          onChange={(e) => onUpdateElement(selectedId, { content: e.target.value })}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Border Thickness (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input-field"
                        value={selectedEl.borderWidth || 0.5}
                        onChange={(e) => onUpdateElement(selectedId, { borderWidth: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                <CornerDownRight size={24} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>No Element Selected</div>
                <div style={{ fontSize: '11.5px', marginTop: '4px' }}>
                  Click an item on the canvas or choose a tool from the left to start designing.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= LAYERS TAB ================= */}
        {activeTab === 'layers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              ELEMENT STACK (TOP TO BOTTOM)
            </span>
            {[...elements].reverse().map((el, revIdx) => {
              const actualIdx = elements.length - 1 - revIdx;
              const isSelected = el.id === selectedId;

              return (
                <div
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-panel-elevated)',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                      {el.type}
                    </span>
                    <span style={{ fontSize: '12px', color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '140px' }}>
                      {el.content ? String(el.content).slice(0, 20) : el.id}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '3px 5px', border: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateElement(el.id, { visible: el.visible === false ? true : false });
                      }}
                      title={el.visible === false ? 'Show' : 'Hide'}
                    >
                      {el.visible === false ? <EyeOff size={13} color="#f87171" /> : <Eye size={13} />}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '3px 5px', border: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorderElement(actualIdx, 'up');
                      }}
                      disabled={actualIdx === elements.length - 1}
                      title="Bring Forward"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '3px 5px', border: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorderElement(actualIdx, 'down');
                      }}
                      disabled={actualIdx === 0}
                      title="Send Backward"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= LABEL SETUP TAB ================= */}
        {activeTab === 'label' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PHYSICAL LABEL MEDIA</span>
              <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                2:1 Aspect Ratio
              </span>
            </div>

            <div style={{ padding: '8px 10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <strong style={{ color: '#ffffff' }}>Confirmed Printer Specs:</strong> 203 DPI, 30 × 15 mm, 240 × 120 Dots (Landscape).
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Width (mm) • {Math.round(label.width * (label.dpi || 203) / 25.4)} dots
                </label>
                <input
                  type="number"
                  step="1"
                  className="input-field"
                  value={label.width}
                  onChange={(e) => setLabel((p) => ({ ...p, width: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Height (mm) • {Math.round(label.height * (label.dpi || 203) / 25.4)} dots
                </label>
                <input
                  type="number"
                  step="1"
                  className="input-field"
                  value={label.height}
                  onChange={(e) => setLabel((p) => ({ ...p, height: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Corner Radius (Die-cut mm)</label>
              <input
                type="number"
                step="0.5"
                className="input-field"
                value={label.borderRadius || 1}
                onChange={(e) => setLabel((p) => ({ ...p, borderRadius: Number(e.target.value) }))}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Printer Resolution (DPI)</label>
              <select
                className="input-field"
                value={label.dpi || 203}
                onChange={(e) => setLabel((p) => ({ ...p, dpi: Number(e.target.value) }))}
              >
                <option value={203}>203 DPI (Confirmed Printer Spec - 8 dots/mm)</option>
                <option value={300}>300 DPI (High Definition)</option>
                <option value={600}>600 DPI (Micro PCB / Electronics)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Snap Grid Spacing</label>
              <select
                className="input-field"
                value={snapGrid}
                onChange={(e) => setSnapGrid(Number(e.target.value))}
              >
                <option value={0}>Disabled (Free Move)</option>
                <option value={0.5}>0.5 mm (Fine Precision)</option>
                <option value={1}>1.0 mm (Recommended)</option>
                <option value={2}>2.0 mm (Standard)</option>
                <option value={5}>5.0 mm (Coarse)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
