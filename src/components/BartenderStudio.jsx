import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import PropertiesPanel from './PropertiesPanel';
import BatchModal from './BatchModal';
import ZplModal from './ZplModal';
import PrintPreviewModal from './PrintPreviewModal';
import TemplatesModal from './TemplatesModal';
import { DEFAULT_TEMPLATES } from '../constants/templates';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import confetti from 'canvas-confetti';

const INITIAL_TEMPLATE = DEFAULT_TEMPLATES[0]; // Rephonix Mobile IMEI (50x30 mm)

export default function App() {
  // Label Media Setup
  const [label, setLabel] = useState({
    width: INITIAL_TEMPLATE.width,
    height: INITIAL_TEMPLATE.height,
    dpi: INITIAL_TEMPLATE.dpi || 203,
    borderRadius: 1.5,
  });

  const [selectedPreset, setSelectedPreset] = useState('Mobile IMEI (50x30 mm)');

  // Elements on the Canvas
  const [elements, setElements] = useState(INITIAL_TEMPLATE.elements);
  const [selectedId, setSelectedId] = useState(null);

  // Undo / Redo History
  const [history, setHistory] = useState([INITIAL_TEMPLATE.elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Tools & Canvas Settings
  const [activeTool, setActiveTool] = useState('select');
  const [snapGrid, setSnapGrid] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  // Batch Data / Variables
  const [batchData, setBatchData] = useState([INITIAL_TEMPLATE.sampleData]);
  const [activeDataIndex, setActiveDataIndex] = useState(0);

  // Modals Visibility
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isZplOpen, setIsZplOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Print Queue Ref for rendering hidden printable elements
  const [printQueue, setPrintQueue] = useState([]);

  // Push state to undo stack
  const pushHistory = useCallback((newElements) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newElements];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setElements(history[prevIdx]);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setElements(history[nextIdx]);
    }
  }, [historyIndex, history]);

  // Global Keyboard listener for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Update Element
  const handleUpdateElement = (id, updatesOrFn) => {
    setElements((prev) => {
      const next = prev.map((el) => {
        if (el.id !== id) return el;
        const updates = typeof updatesOrFn === 'function' ? updatesOrFn(el) : updatesOrFn;
        return { ...el, ...updates };
      });
      pushHistory(next);
      return next;
    });
  };

  // Add Element from Toolbar
  const handleAddElement = (newElProps) => {
    const id = `el_${Date.now()}`;
    const newEl = {
      id,
      x: 4,
      y: 4,
      rotation: 0,
      visible: true,
      ...newElProps,
    };
    const next = [...elements, newEl];
    setElements(next);
    setSelectedId(id);
    pushHistory(next);
  };

  // Delete Element
  const handleDeleteElement = (id) => {
    const next = elements.filter((el) => el.id !== id);
    setElements(next);
    setSelectedId(null);
    pushHistory(next);
  };

  // Duplicate Element
  const handleDuplicateElement = (id) => {
    const target = elements.find((el) => el.id === id);
    if (!target) return;
    const duplicated = {
      ...target,
      id: `el_${Date.now()}`,
      x: Math.min(label.width - target.width, target.x + 2),
      y: Math.min(label.height - target.height, target.y + 2),
    };
    const next = [...elements, duplicated];
    setElements(next);
    setSelectedId(duplicated.id);
    pushHistory(next);
  };

  // Reorder Elements (z-index)
  const handleReorderElement = (index, direction) => {
    const newIdx = direction === 'up' ? index + 1 : index - 1;
    if (newIdx < 0 || newIdx >= elements.length) return;

    const next = [...elements];
    const [moved] = next.splice(index, 1);
    next.splice(newIdx, 0, moved);

    setElements(next);
    pushHistory(next);
  };

  // Load a Pre-Built Template
  const handleApplyTemplate = (tpl) => {
    setLabel({
      width: tpl.width,
      height: tpl.height,
      dpi: tpl.dpi || 203,
      borderRadius: 1.5,
    });
    setSelectedPreset(tpl.name);
    setElements(tpl.elements);
    setSelectedId(null);
    if (tpl.sampleData) {
      setBatchData([tpl.sampleData]);
      setActiveDataIndex(0);
    }
    pushHistory(tpl.elements);

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.2 } });
    } catch {
      // Confetti fallback
    }
  };

  // Export Template to JSON file
  const handleExportJson = () => {
    const exportData = {
      rephonixVersion: '2.4',
      name: selectedPreset || 'Rephonix Label',
      label,
      elements,
      sampleData: batchData[0] || {},
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rephonix_${label.width}x${label.height}mm.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Template from JSON file
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.label && imported.elements) {
          setLabel(imported.label);
          setElements(imported.elements);
          setSelectedPreset(imported.name || 'Imported Template');
          if (imported.sampleData) {
            setBatchData([imported.sampleData]);
            setActiveDataIndex(0);
          }
          pushHistory(imported.elements);
        }
      } catch (err) {
        alert('Invalid template JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Direct Hardware Thermal Print Execution
  const handleTriggerDirectPrint = ({ printMode, copiesPerLabel = 1 }) => {
    // Generate records to print
    let records = [];
    if (printMode === 'all' && batchData.length > 0) {
      records = batchData;
    } else {
      records = [batchData[activeDataIndex] || {}];
    }

    // Multiply by copies
    const fullQueue = [];
    for (const rec of records) {
      for (let c = 0; c < copiesPerLabel; c++) {
        fullQueue.push(rec);
      }
    }

    setPrintQueue(fullQueue);

    // Dynamic @page size injection
    let styleTag = document.getElementById('rephonix-dynamic-page-size');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'rephonix-dynamic-page-size';
      document.head.appendChild(styleTag);
    }

    // Exact millimeter page dimensions for thermal printers
    styleTag.innerHTML = `
      @page {
        size: ${label.width}mm ${label.height}mm;
        margin: 0mm;
      }
    `;

    setIsPrintOpen(false);

    // Small delay to ensure DOM render before print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const activeRecord = batchData[activeDataIndex] || {};

  const substitute = (text, record) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      return record[cleanKey] !== undefined ? record[cleanKey] : match;
    });
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header
        label={label}
        setLabel={setLabel}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenZpl={() => setIsZplOpen(true)}
        onOpenPrint={() => setIsPrintOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        sampleDataCount={batchData.length}
      />

      {/* Main Workspace (Left Tools + Center Canvas + Right Inspector) */}
      <div className="main-workspace">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onAddElement={handleAddElement}
        />

        <Canvas
          label={label}
          elements={elements}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          activeData={activeRecord}
          snapGrid={snapGrid}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
        />

        <PropertiesPanel
          label={label}
          setLabel={setLabel}
          elements={elements}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onReorderElement={handleReorderElement}
          snapGrid={snapGrid}
          setSnapGrid={setSnapGrid}
        />
      </div>

      {/* ================= MODALS ================= */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        currentLabel={label}
        currentElements={elements}
      />

      <BatchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        batchData={batchData}
        setBatchData={setBatchData}
        activeDataIndex={activeDataIndex}
        setActiveDataIndex={setActiveDataIndex}
      />

      <ZplModal
        isOpen={isZplOpen}
        onClose={() => setIsZplOpen(false)}
        label={label}
        elements={elements}
      />

      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        label={label}
        elements={elements}
        batchData={batchData}
        activeDataIndex={activeDataIndex}
        onTriggerDirectPrint={handleTriggerDirectPrint}
      />

      {/* ================= HIDDEN PRINTABLE CONTAINER ================= */}
      {/* This renders only when window.print() is executed */}
      <div className="printable-area" style={{ display: 'none' }}>
        {(printQueue.length > 0 ? printQueue : [activeRecord]).map((rec, queueIdx) => (
          <div
            key={queueIdx}
            className="print-page-label"
            style={{
              width: `${label.width}mm`,
              height: `${label.height}mm`,
              position: 'relative',
              overflow: 'hidden',
              pageBreakAfter: 'always',
              breakAfter: 'page',
            }}
          >
            {elements.map((el) => {
              if (el.visible === false) return null;
              const contentSubstituted = substitute(el.content, rec);

              return (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute',
                    left: `${el.x}mm`,
                    top: `${el.y}mm`,
                    width: `${el.width}mm`,
                    height: `${el.height}mm`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
                    zIndex: el.zIndex || 1,
                  }}
                >
                  {el.type === 'text' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${el.fontSize * 1.33}px`,
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
                        border: `${(el.borderWidth || 0.5)}mm solid ${el.borderColor || '#000000'}`,
                        borderRadius: `${el.borderRadius || 1}mm`,
                        backgroundColor: el.fill || 'transparent',
                      }}
                    />
                  )}

                  {el.type === 'line' && (
                    <div
                      style={{
                        width: '100%',
                        height: `${el.borderWidth || 0.5}mm`,
                        backgroundColor: el.color || '#000000',
                      }}
                    />
                  )}

                  {el.type === 'badge' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        border: `${el.borderWidth || 0.5}mm solid #000000`,
                        borderRadius: '1mm',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: `${el.height * 0.5}mm`,
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
        ))}
      </div>
    </div>
  );
}
