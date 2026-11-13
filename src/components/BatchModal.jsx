import React, { useState } from 'react';
import Papa from 'papaparse';
import { 
  X, 
  Upload, 
  Sparkles, 
  FileSpreadsheet, 
  Check, 
  RefreshCw, 
  Hash, 
  Table as TableIcon,
  Plus
} from 'lucide-react';

export default function BatchModal({
  isOpen,
  onClose,
  batchData,
  setBatchData,
  activeDataIndex,
  setActiveDataIndex,
}) {
  const [activeTab, setActiveTab] = useState('csv'); // 'csv' | 'sequence'
  
  // Sequence Generator State
  const [seqPrefix, setSeqPrefix] = useState('RPX-');
  const [seqStart, setSeqStart] = useState(1001);
  const [seqCount, setSeqCount] = useState(25);
  const [seqDigits, setSeqDigits] = useState(4);
  const [seqTargetVar, setSeqTargetVar] = useState('serial');
  const [seqModel, setSeqModel] = useState('iPhone 13 Pro 128GB');
  const [seqPrice, setSeqPrice] = useState('42999');

  if (!isOpen) return null;

  // Handle CSV Upload via PapaParse
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setBatchData(results.data);
          setActiveDataIndex(0);
        }
      },
      error: (err) => {
        alert('Failed to parse CSV file: ' + err.message);
      },
    });
  };

  // Generate Auto-Increment Series
  const handleGenerateSequence = () => {
    const rows = [];
    const baseImei = 862451049280000;

    for (let i = 0; i < Number(seqCount); i++) {
      const num = Number(seqStart) + i;
      const padded = String(num).padStart(Number(seqDigits), '0');
      const serialVal = `${seqPrefix}${padded}`;
      const imei1Val = String(baseImei + num);
      const imei2Val = String(baseImei + num + 8000);

      rows.push({
        serial: serialVal,
        imei1: imei1Val,
        imei2: imei2Val,
        model: seqModel,
        price: seqPrice,
        mrp: String(Math.round(Number(seqPrice) * 1.35)),
        barcode: imei1Val.slice(0, 12),
        tracking_no: `RPX-EXP-${num}`,
      });
    }

    setBatchData(rows);
    setActiveDataIndex(0);
  };

  // Headers from current batch data
  const headers = batchData.length > 0 ? Object.keys(batchData[0]) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-sm)' }}>
              <FileSpreadsheet size={20} color="#10b981" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Batch Data & Variable Integration</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Populate labels from Excel / CSV spreadsheets or auto-generate serial sequences.
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px', background: 'var(--bg-panel)' }}>
          <button
            onClick={() => setActiveTab('csv')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'csv' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'csv' ? '#ffffff' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={14} />
            <span>Upload CSV File</span>
          </button>
          <button
            onClick={() => setActiveTab('sequence')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sequence' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'sequence' ? '#ffffff' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Hash size={14} />
            <span>Auto Serialization Generator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'csv' && (
            <div>
              {/* Dropzone */}
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 20px',
                  border: '2px dashed var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: 'var(--bg-app)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '12px' }}>
                  <Upload size={28} color="#3b82f6" />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  Click to choose or drag & drop CSV file
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Supports CSV exported from Excel, ERP, Tally, or Inventory Systems (e.g. IMEI, Model, Price, Serial)
                </div>
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {activeTab === 'sequence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Prefix</label>
                  <input
                    type="text"
                    className="input-field"
                    value={seqPrefix}
                    onChange={(e) => setSeqPrefix(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Start Number</label>
                  <input
                    type="number"
                    className="input-field"
                    value={seqStart}
                    onChange={(e) => setSeqStart(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Quantity (Labels)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={seqCount}
                    onChange={(e) => setSeqCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Model / Description</label>
                  <input
                    type="text"
                    className="input-field"
                    value={seqModel}
                    onChange={(e) => setSeqModel(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Price (₹)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={seqPrice}
                    onChange={(e) => setSeqPrice(e.target.value)}
                  />
                </div>
              </div>

              <button className="btn btn-emerald" onClick={handleGenerateSequence}>
                <Sparkles size={16} />
                <span>Generate {seqCount} Sequential Records</span>
              </button>
            </div>
          )}

          {/* Current Batch Table Preview */}
          {batchData.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.5px' }}>
                  LOADED RECORDS ({batchData.length} ROWS)
                </span>
                <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                  Active Record: #{activeDataIndex + 1}
                </span>
              </div>

              <div style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, width: '50px' }}>#</th>
                      {headers.map((h) => (
                        <th key={h} style={{ padding: '8px 12px', color: '#60a5fa', fontWeight: 600 }}>
                          {`{{${h}}}`}
                        </th>
                      ))}
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)', width: '80px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.slice(0, 50).map((row, idx) => {
                      const isActive = idx === activeDataIndex;
                      return (
                        <tr
                          key={idx}
                          style={{
                            background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                            borderBottom: '1px solid var(--border-subtle)',
                          }}
                        >
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {idx + 1}
                          </td>
                          {headers.map((h) => (
                            <td key={h} style={{ padding: '8px 12px', color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                              {String(row[h] || '')}
                            </td>
                          ))}
                          <td style={{ padding: '8px 12px' }}>
                            <button
                              className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                              onClick={() => setActiveDataIndex(idx)}
                            >
                              {isActive ? 'Previewing' : 'Use'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-panel-elevated)' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
