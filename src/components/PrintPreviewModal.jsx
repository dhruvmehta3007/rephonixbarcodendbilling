import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';

export default function PrintPreviewModal({
  isOpen,
  onClose,
  label,
  elements,
  batchData = [],
  activeDataIndex,
  onTriggerDirectPrint,
}) {
  const [printMode, setPrintMode] = useState('current'); // 'current' | 'all' | 'range'
  const [copiesPerLabel, setCopiesPerLabel] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);

  if (!isOpen) return null;

  const totalRecords = batchData.length > 0 ? batchData.length : 1;
  const currentRecord = batchData[previewPage] || batchData[activeDataIndex] || {};

  const substitute = (text, data) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      return data[cleanKey] !== undefined ? data[cleanKey] : match;
    });
  };

  const handlePrint = () => {
    onTriggerDirectPrint({
      printMode,
      copiesPerLabel,
    });
  };

  // Preview scale for the modal (approx 3 px per mm)
  const previewScale = 3.2;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-sm)' }}>
              <Printer size={20} color="#3b82f6" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Thermal Print Preview & Dispatch</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Exact millimeter thermal print output calibrated for 203/300 DPI thermal roll heads.
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Print Configuration Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '14px 20px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PRINT SCOPE</label>
            <select
              className="input-field"
              style={{ marginTop: '4px' }}
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value)}
            >
              <option value="current">Current Label Only (Record #{previewPage + 1})</option>
              {batchData.length > 0 && (
                <option value="all">Entire Batch ({batchData.length} Labels)</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>COPIES PER LABEL</label>
            <input
              type="number"
              min="1"
              max="999"
              className="input-field"
              style={{ marginTop: '4px' }}
              value={copiesPerLabel}
              onChange={(e) => setCopiesPerLabel(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PAGE DIMENSION</label>
            <div style={{ marginTop: '7px', fontSize: '12.5px', color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {label.width} × {label.height} mm ({label.dpi || 203} DPI)
            </div>
          </div>
        </div>

        {/* Center Preview Display */}
        <div style={{ padding: '30px 20px', background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', overflow: 'auto' }}>
          {/* Label Card */}
          <div
            style={{
              width: `${label.width * previewScale}px`,
              height: `${label.height * previewScale}px`,
              background: '#ffffff',
              borderRadius: `${(label.borderRadius || 2) * (previewScale / 3.78)}px`,
              position: 'relative',
              boxShadow: 'var(--shadow-canvas)',
              overflow: 'hidden',
            }}
          >
            {elements.map((el) => {
              if (el.visible === false) return null;
              const contentSubstituted = substitute(el.content, currentRecord);

              return (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute',
                    left: `${el.x * previewScale}px`,
                    top: `${el.y * previewScale}px`,
                    width: `${el.width * previewScale}px`,
                    height: `${el.height * previewScale}px`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
                    zIndex: el.zIndex || 1,
                  }}
                >
                  {el.type === 'text' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${el.fontSize * (previewScale / 3.78) * 1.33}px`,
                        fontWeight: el.fontWeight || 'normal',
                        fontFamily: el.fontFamily ? `"${el.fontFamily}", sans-serif` : 'sans-serif',
                        color: el.color || '#000000',
                        textAlign: el.textAlign || 'left',
                        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : 'normal',
                        lineHeight: 1.15,
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          el.textAlign === 'center'
                            ? 'center'
                            : el.textAlign === 'right'
                            ? 'flex-end'
                            : 'flex-start',
                      }}
                    >
                      {contentSubstituted}
                    </div>
                  )}

                  {el.type === 'barcode' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvg({
                          type: el.symbology || 'code128',
                          value: contentSubstituted,
                          includeText: el.showText,
                          height: el.height * 2,
                          scale: 2,
                        }),
                      }}
                    />
                  )}

                  {['qrcode', 'datamatrix', 'pdf417'].includes(el.type) && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvg({
                          type: el.type,
                          value: contentSubstituted,
                          scale: 3,
                        }),
                      }}
                    />
                  )}

                  {el.type === 'rect' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        border: `${(el.borderWidth || 0.5) * previewScale * 0.25}px solid ${el.borderColor || '#000000'}`,
                        borderRadius: `${(el.borderRadius || 1) * previewScale * 0.25}px`,
                        backgroundColor: el.fill || 'transparent',
                      }}
                    />
                  )}

                  {el.type === 'line' && (
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(1, (el.borderWidth || 0.5) * previewScale * 0.25)}px`,
                        backgroundColor: el.color || '#000000',
                      }}
                    />
                  )}

                  {el.type === 'badge' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        border: `${(el.borderWidth || 0.5) * previewScale * 0.25}px solid #000000`,
                        borderRadius: `${(el.borderRadius || 1) * 2}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: `${el.height * 1.8}px`,
                        fontWeight: 'bold',
                        fontFamily: 'Inter, sans-serif',
                        color: '#000000',
                      }}
                    >
                      {contentSubstituted}
                    </div>
                  )}

                  {el.type === 'image' && (
                    <img
                      src={el.content}
                      alt="Logo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'grayscale(100%) contrast(150%)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination for Batch Records */}
          {batchData.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '5px 8px' }}
                disabled={previewPage <= 0}
                onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Record {previewPage + 1} of {batchData.length}
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '5px 8px' }}
                disabled={previewPage >= batchData.length - 1}
                onClick={() => setPreviewPage((p) => Math.min(batchData.length - 1, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Output:</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
              {printMode === 'all' ? batchData.length * copiesPerLabel : 1 * copiesPerLabel} Label(s)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span style={{ fontWeight: 600 }}>Send to Printer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
