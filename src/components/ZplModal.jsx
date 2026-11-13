import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Usb, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { generateZPL } from '../utils/zplGenerator';
import { generateTSPL } from '../utils/tsplGenerator';
import { isWebSerialSupported, sendRawToSerialPrinter } from '../utils/webSerial';

export default function ZplModal({
  isOpen,
  onClose,
  label,
  elements,
}) {
  const [lang, setLang] = useState('zpl'); // 'zpl' | 'tspl'
  const [copied, setCopied] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const zplCode = generateZPL(label, elements, { quantity });
  const tsplCode = generateTSPL(label, elements, { quantity });
  const currentCode = lang === 'zpl' ? zplCode : tsplCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = lang === 'zpl' ? 'zpl' : 'tspl';
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rephonix_label_${label.width}x${label.height}mm.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWebSerialPrint = async () => {
    setIsSending(true);
    setStatusMsg(null);
    try {
      await sendRawToSerialPrinter(currentCode);
      setStatusMsg({ type: 'success', text: 'Commands sent directly to thermal printer!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to print via WebSerial' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-sm)' }}>
              <Cpu size={20} color="#f59e0b" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Direct Thermal Machine Code</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Zebra ZPL II & TSC / TVS TSPL raw machine code for direct hardware printing.
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Format Selector & Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${lang === 'zpl' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLang('zpl')}
            >
              Zebra ZPL II (ZTC, GX420, ZD220, ZT410)
            </button>
            <button
              className={`btn ${lang === 'tspl' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLang('tspl')}
            >
              TSC / TVS / Xprinter TSPL (TE244, LP46)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Copies:</span>
            <input
              type="number"
              min="1"
              max="999"
              className="input-field"
              style={{ width: '60px', padding: '4px 8px' }}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>

        {/* Code Viewer Body */}
        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              background: '#070a12',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              padding: '14px',
              overflow: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              color: '#38bdf8',
              lineHeight: 1.5,
              whiteSpace: 'pre',
              userSelect: 'all',
              maxHeight: '340px',
            }}
          >
            {currentCode}
          </div>

          {statusMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${statusMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: statusMsg.type === 'success' ? '#34d399' : '#f87171',
              }}
            >
              <AlertCircle size={15} />
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
            </button>
            <button className="btn btn-secondary" onClick={handleDownload}>
              <Download size={15} />
              <span>Download .{lang}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isWebSerialSupported() ? (
              <button
                className="btn btn-emerald"
                disabled={isSending}
                onClick={handleWebSerialPrint}
                title="Send raw bytes directly to USB printer without driver"
              >
                <Usb size={16} />
                <span>{isSending ? 'Sending to Port...' : 'Direct WebUSB / Serial Print'}</span>
              </button>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                (WebSerial direct USB print supported in Chrome/Edge)
              </span>
            )}
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
