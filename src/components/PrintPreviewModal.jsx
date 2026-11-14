import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  CheckCircle, 
  Image as ImageIcon,
  Sparkles,
  Layers
} from 'lucide-react';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import { PRINTER_CONFIG, DOTS_PER_MM } from '../constants/printerConfig';
import { renderLabelToRasterDataUrl, renderLabelToRasterBlob } from '../utils/rasterGenerator';

export default function PrintPreviewModal({
  isOpen,
  onClose,
  label,
  elements,
  batchData = [],
  activeDataIndex,
  onTriggerDirectPrint,
}) {
  const [printMode, setPrintMode] = useState('current'); // 'current' | 'all'
  const [copiesPerLabel, setCopiesPerLabel] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);
  const [viewMode, setViewMode] = useState('raster'); // 'raster' (320x160 1:1 dot) | 'vector'
  const [rasterUrl, setRasterUrl] = useState('');
  const [rasterLoading, setRasterLoading] = useState(false);
  const [rasterZoom, setRasterZoom] = useState(1.5); // 1.0 = 320x160 px, 1.5 = 480x240 px, 2.0 = 640x320 px

  const currentRecord = batchData[previewPage] || batchData[activeDataIndex] || {};

  // Generate raster image whenever record or elements change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setRasterLoading(true);

    renderLabelToRasterDataUrl(label, elements, currentRecord)
      .then((url) => {
        if (!isCancelled) {
          setRasterUrl(url);
          setRasterLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate raster preview:', err);
        if (!isCancelled) setRasterLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, label, elements, previewPage, activeDataIndex, currentRecord]);

  if (!isOpen) return null;

  const substitute = (text, data) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      return data[cleanKey] !== undefined ? data[cleanKey] : match;
    });
  };

  const handlePrint = (useRaster = false) => {
    onTriggerDirectPrint({
      printMode,
      copiesPerLabel,
      useRaster,
    });
  };

  const widthMm = Number(label.width) || PRINTER_CONFIG.widthMM;
  const heightMm = Number(label.height) || PRINTER_CONFIG.heightMM;
  const widthDots = Number(label.widthDots) || Math.round(widthMm * 8) || PRINTER_CONFIG.widthDots; // 240
  const heightDots = Number(label.heightDots) || Math.round(heightMm * 8) || PRINTER_CONFIG.heightDots; // 120

  const handleDownloadRaster = async () => {
    try {
      const blob = await renderLabelToRasterBlob(label, elements, currentRecord);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label-${widthDots}x${heightDots}-203dpi-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download raster failed:', e);
    }
  };

  // Preview scale for vector view: 14 px/mm (30 mm x 14 = 420 px, 15 mm x 14 = 210 px, 2:1 aspect ratio)
  const previewScale = 14;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '95vw' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-sm)' }}>
              <Printer size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Thermal Print Preview & Dispatch</h2>
                <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {label.dpi || PRINTER_CONFIG.dpi} DPI • {widthDots} × {heightDots} DOTS
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Exact {widthMm} × {heightMm} mm thermal output (2:1 aspect ratio) calibrated for 1:1 hardware dot alignment.
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Print Configuration Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '14px 20px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PRINT SCOPE</label>
            <select
              className="input-field"
              style={{ marginTop: '4px' }}
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value)}
            >
              <option value="current">Current Label (#{previewPage + 1})</option>
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
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PREVIEW MODE</label>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button
                type="button"
                className={`btn ${viewMode === 'raster' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                onClick={() => setViewMode('raster')}
                title={`1:1 Printer-Dot Raster (${widthDots} × ${heightDots} px)`}
              >
                1:1 Dot Raster
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'vector' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                onClick={() => setViewMode('vector')}
                title={`WYSIWYG Vector (${widthMm} × ${heightMm} mm)`}
              >
                Vector (2:1)
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>HARDWARE SPEC</label>
            <div style={{ marginTop: '5px', fontSize: '11.5px', color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 600, lineHeight: 1.2 }}>
              {widthMm} × {heightMm} mm (2:1)<br />
              <span style={{ color: '#94a3b8', fontSize: '10.5px' }}>{widthDots} × {heightDots} dots @ {label.dpi || 203} DPI</span>
            </div>
          </div>
        </div>

        {/* Center Preview Display */}
        <div style={{ padding: '24px 20px', background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', overflow: 'auto' }}>
          
          {/* Zoom controls for 1:1 raster view */}
          {viewMode === 'raster' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', background: 'rgba(19, 27, 46, 0.8)', padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Raster View Zoom:</span>
              <button
                className={`btn ${rasterZoom === 1.0 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
                onClick={() => setRasterZoom(1.0)}
              >
                1:1 ({widthDots}×{heightDots} px)
              </button>
              <button
                className={`btn ${rasterZoom === 1.5 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
                onClick={() => setRasterZoom(1.5)}
              >
                1.5× ({Math.round(widthDots * 1.5)}×{Math.round(heightDots * 1.5)} px)
              </button>
              <button
                className={`btn ${rasterZoom === 2.0 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
                onClick={() => setRasterZoom(2.0)}
              >
                2.0× ({widthDots * 2}×{heightDots * 2} px)
              </button>
            </div>
          )}

          {/* VIEW MODE 1: 1:1 PRINTER-DOT RASTER */}
          {viewMode === 'raster' && (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {rasterLoading ? (
                <div style={{ width: `${widthDots * rasterZoom}px`, height: `${heightDots * rasterZoom}px`, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', borderRadius: '4px' }}>
                  Rasterizing {widthDots} × {heightDots} dots...
                </div>
              ) : (
                <div
                  style={{
                    width: `${widthDots * rasterZoom}px`,
                    height: `${heightDots * rasterZoom}px`,
                    aspectRatio: '2 / 1',
                    background: '#ffffff',
                    boxShadow: 'var(--shadow-canvas), 0 0 0 1px rgba(0,0,0,0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={rasterUrl}
                    alt="1:1 Printer Dot Raster"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      imageRendering: 'pixelated',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                Exact 1:1 Printer-Dot Raster Canvas: {widthDots} × {heightDots} px (Aspect Ratio 2:1)
              </div>
            </div>
          )}

          {/* VIEW MODE 2: WYSIWYG VECTOR PREVIEW (2:1 ASPECT RATIO) */}
          {viewMode === 'vector' && (
            <div
              style={{
                width: `${widthMm * previewScale}px`,
                height: `${heightMm * previewScale}px`,
                aspectRatio: '2 / 1',
                background: '#ffffff',
                borderRadius: `${(label.borderRadius || 1) * 3}px`,
                position: 'relative',
                boxShadow: 'var(--shadow-canvas), 0 0 0 1px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              {elements.map((el) => {
                if (el.visible === false) return null;
                const contentSubstituted = substitute(el.content, currentRecord);

                const leftPx = el.x * previewScale;
                const topPx = el.y * previewScale;
                const widthPx = el.width * previewScale;
                const heightPx = el.height * previewScale;

                return (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      width: `${widthPx}px`,
                      height: `${heightPx}px`,
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
                      zIndex: el.zIndex || 1,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
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
                            height: Math.max(8, el.height * 2),
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
                          border: `${Math.max(1, (el.borderWidth || 0.5) * previewScale * 0.25)}px solid ${el.borderColor || '#000000'}`,
                          borderRadius: `${(el.borderRadius || 1) * previewScale * 0.2}px`,
                          backgroundColor: el.fill || 'transparent',
                          boxSizing: 'border-box',
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
                          border: `${Math.max(1, (el.borderWidth || 0.5) * previewScale * 0.25)}px solid #000000`,
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: `${el.height * 2.2}px`,
                          fontWeight: 'bold',
                          fontFamily: 'Inter, sans-serif',
                          color: '#000000',
                          boxSizing: 'border-box',
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
          )}

          {/* Pagination for Batch Records */}
          {batchData.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
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

        {/* Tip Banner */}
        <div style={{ padding: '8px 20px', background: 'rgba(59, 130, 246, 0.08)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>
            💡 <strong>Printer Tip:</strong> In your browser print dialog, set <strong>Margins: None</strong> and <strong>Scale: 100%</strong> to prevent automatic scaling.
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
            Fixed: {widthMm} × {heightMm} mm ({widthDots} × {heightDots} px)
          </span>
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
            <button className="btn btn-secondary" onClick={handleDownloadRaster} title={`Download ${widthDots}x${heightDots} 1:1 PNG`}>
              <Download size={15} />
              <span>Download {widthDots}×{heightDots} PNG</span>
            </button>
            <button className="btn btn-primary" onClick={() => handlePrint(viewMode === 'raster')}>
              <Printer size={16} />
              <span style={{ fontWeight: 600 }}>Send to Printer ({viewMode === 'raster' ? '1:1 Raster' : 'Vector'})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
