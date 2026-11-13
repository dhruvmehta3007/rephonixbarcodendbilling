import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid, RotateCcw } from 'lucide-react';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';

// Base conversion factor: 96 screen DPI / 25.4 mm/inch = 3.779527559 pixels per mm
const BASE_MM_TO_PX = 3.779527559;

export default function Canvas({
  label,
  elements,
  selectedId,
  setSelectedId,
  onUpdateElement,
  onDeleteElement,
  activeData = {},
  snapGrid = 1, // mm
  showGrid = true,
  setShowGrid,
}) {
  const [zoom, setZoom] = useState(1.6); // 160% default comfortable zoom
  const [dragState, setDragState] = useState(null); // { mode: 'move' | 'resize', handle, startX, startY, origX, origY, origW, origH }
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const mmToPx = (mm) => mm * BASE_MM_TO_PX * zoom;
  const pxToMm = (px) => px / (BASE_MM_TO_PX * zoom);

  // Substitute variables like {{imei1}} with activeData
  const substitute = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      return activeData[cleanKey] !== undefined ? activeData[cleanKey] : match;
    });
  };

  // Keyboard shortcut listener for nudge and delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedId) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      const step = e.shiftKey ? 5 : (snapGrid || 1);

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedId);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateElement(selectedId, (el) => ({ x: Math.max(0, el.x - step) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateElement(selectedId, (el) => ({ x: Math.min(label.width - el.width, el.x + step) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateElement(selectedId, (el) => ({ y: Math.max(0, el.y - step) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateElement(selectedId, (el) => ({ y: Math.min(label.height - el.height, el.y + step) }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, label, snapGrid, onUpdateElement, onDeleteElement]);

  // Pointer move handler during drag/resize
  const handlePointerMove = (e) => {
    if (!dragState) return;

    const dxPx = e.clientX - dragState.startX;
    const dyPx = e.clientY - dragState.startY;

    const dxMm = pxToMm(dxPx);
    const dyMm = pxToMm(dyPx);

    if (dragState.mode === 'move') {
      let newX = dragState.origX + dxMm;
      let newY = dragState.origY + dyMm;

      if (snapGrid > 0) {
        newX = Math.round(newX / snapGrid) * snapGrid;
        newY = Math.round(newY / snapGrid) * snapGrid;
      }

      newX = Math.max(0, Math.min(label.width - dragState.origW, newX));
      newY = Math.max(0, Math.min(label.height - dragState.origH, newY));

      onUpdateElement(dragState.id, { x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)) });
    } else if (dragState.mode === 'resize') {
      const handle = dragState.handle;
      let newW = dragState.origW;
      let newH = dragState.origH;
      let newX = dragState.origX;
      let newY = dragState.origY;

      if (handle.includes('e')) newW = Math.max(2, dragState.origW + dxMm);
      if (handle.includes('s')) newH = Math.max(2, dragState.origH + dyMm);
      if (handle.includes('w')) {
        const proposedW = Math.max(2, dragState.origW - dxMm);
        newX = dragState.origX + (dragState.origW - proposedW);
        newW = proposedW;
      }
      if (handle.includes('n')) {
        const proposedH = Math.max(2, dragState.origH - dyMm);
        newY = dragState.origY + (dragState.origH - proposedH);
        newH = proposedH;
      }

      if (snapGrid > 0) {
        newW = Math.round(newW / snapGrid) * snapGrid;
        newH = Math.round(newH / snapGrid) * snapGrid;
      }

      onUpdateElement(dragState.id, {
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
        width: Number(newW.toFixed(1)),
        height: Number(newH.toFixed(1)),
      });
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  const selectedEl = elements.find((e) => e.id === selectedId);

  // Generate ticks for Millimeter Ruler
  const renderRulerTicks = (lengthMm, isHorizontal) => {
    const ticks = [];
    const count = Math.ceil(lengthMm);
    for (let i = 0; i <= count; i += 1) {
      const posPx = mmToPx(i);
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;

      if (isHorizontal) {
        ticks.push(
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${posPx}px`,
              bottom: 0,
              width: '1px',
              height: isMajor ? '12px' : isMid ? '8px' : '4px',
              background: isMajor ? '#94a3b8' : '#475569',
            }}
          >
            {isMajor && (
              <span
                style={{
                  position: 'absolute',
                  left: '2px',
                  top: '-14px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: '#94a3b8',
                }}
              >
                {i}
              </span>
            )}
          </div>
        );
      } else {
        ticks.push(
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${posPx}px`,
              right: 0,
              height: '1px',
              width: isMajor ? '12px' : isMid ? '8px' : '4px',
              background: isMajor ? '#94a3b8' : '#475569',
            }}
          >
            {isMajor && (
              <span
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '-6px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: '#94a3b8',
                }}
              >
                {i}
              </span>
            )}
          </div>
        );
      }
    }
    return ticks;
  };

  return (
    <div
      ref={containerRef}
      className="canvas-viewport"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (e.target === containerRef.current || e.target.classList.contains('canvas-viewport')) {
          setSelectedId(null);
        }
      }}
    >
      {/* Floating Canvas Controls */}
      <div
        className="canvas-controls no-print"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(19, 27, 46, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-md)',
          zIndex: 50,
        }}
      >
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', border: 'none' }}
          onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>

        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', minWidth: '45px', textAlign: 'center', color: '#60a5fa', fontWeight: 600 }}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', border: 'none' }}
          onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />

        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', border: 'none' }}
          onClick={() => setZoom(1.0)}
          title="Actual 1:1 Scale"
        >
          <Maximize2 size={13} />
          <span style={{ fontSize: '11px' }}>1:1</span>
        </button>

        <button
          className={`btn ${showGrid ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', border: 'none' }}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Alignment Grid"
        >
          <Grid size={13} />
          <span style={{ fontSize: '11px' }}>Grid</span>
        </button>
      </div>

      {/* Rulers and Label Assembly */}
      <div style={{ position: 'relative', margin: '40px' }}>
        {/* Top Millimeter Ruler */}
        <div
          className="canvas-ruler no-print"
          style={{
            position: 'absolute',
            left: 0,
            top: '-26px',
            width: `${mmToPx(label.width)}px`,
            height: '24px',
            background: 'rgba(19, 27, 46, 0.7)',
            borderBottom: '1px solid var(--border-light)',
            overflow: 'hidden',
          }}
        >
          {renderRulerTicks(label.width, true)}
        </div>

        {/* Left Millimeter Ruler */}
        <div
          className="canvas-ruler no-print"
          style={{
            position: 'absolute',
            left: '-26px',
            top: 0,
            width: '24px',
            height: `${mmToPx(label.height)}px`,
            background: 'rgba(19, 27, 46, 0.7)',
            borderRight: '1px solid var(--border-light)',
            overflow: 'hidden',
          }}
        >
          {renderRulerTicks(label.height, false)}
        </div>

        {/* Physical Label Surface (WYSIWYG Card) */}
        <div
          ref={canvasRef}
          className="label-canvas-card print-page-label"
          style={{
            width: `${mmToPx(label.width)}px`,
            height: `${mmToPx(label.height)}px`,
            borderRadius: `${(label.borderRadius || 2) * zoom}px`,
            backgroundImage: showGrid
              ? `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`
              : 'none',
            backgroundSize: `${mmToPx(snapGrid || 1)}px ${mmToPx(snapGrid || 1)}px`,
          }}
          onClick={(e) => {
            if (e.target === canvasRef.current) setSelectedId(null);
          }}
        >
          {elements.map((el) => {
            if (el.visible === false) return null;

            const isSelected = el.id === selectedId;
            const contentSubstituted = substitute(el.content);

            return (
              <div
                key={el.id}
                className={`canvas-element ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${mmToPx(el.x)}px`,
                  top: `${mmToPx(el.y)}px`,
                  width: `${mmToPx(el.width)}px`,
                  height: `${mmToPx(el.height)}px`,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
                  zIndex: isSelected ? 40 : el.zIndex || 1,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(el.id);
                  setDragState({
                    mode: 'move',
                    id: el.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: el.x,
                    origY: el.y,
                    origW: el.width,
                    origH: el.height,
                  });
                }}
              >
                {/* Element Renderers */}
                {el.type === 'text' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      fontSize: `${el.fontSize * zoom * 1.33}px`,
                      fontWeight: el.fontWeight || 'normal',
                      fontFamily: el.fontFamily ? `"${el.fontFamily}", sans-serif` : 'sans-serif',
                      color: el.color || '#000000',
                      textAlign: el.textAlign || 'left',
                      letterSpacing: el.letterSpacing ? `${el.letterSpacing * zoom}px` : 'normal',
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
                      border: `${(el.borderWidth || 0.5) * zoom * BASE_MM_TO_PX * 0.25}px solid ${el.borderColor || '#000000'}`,
                      borderRadius: `${(el.borderRadius || 1) * zoom * BASE_MM_TO_PX * 0.25}px`,
                      backgroundColor: el.fill || 'transparent',
                    }}
                  />
                )}

                {el.type === 'line' && (
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(1, (el.borderWidth || 0.5) * zoom * BASE_MM_TO_PX * 0.25)}px`,
                      backgroundColor: el.color || '#000000',
                    }}
                  />
                )}

                {el.type === 'badge' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      border: `${(el.borderWidth || 0.5) * zoom * BASE_MM_TO_PX * 0.25}px solid #000000`,
                      borderRadius: `${(el.borderRadius || 1) * zoom * 2}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: `${el.height * zoom * 2.2}px`,
                      fontWeight: 'bold',
                      fontFamily: 'Inter, sans-serif',
                      color: '#000000',
                      letterSpacing: '0.5px',
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
                      filter: 'grayscale(100%) contrast(150%)', // Monochromatic thermal filter
                    }}
                  />
                )}

                {/* Selection Resize Handles */}
                {isSelected && (
                  <>
                    {['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'].map((handle) => {
                      const posStyle = {};
                      if (handle.includes('n')) posStyle.top = '-4px';
                      if (handle.includes('s')) posStyle.bottom = '-4px';
                      if (handle.includes('w')) posStyle.left = '-4px';
                      if (handle.includes('e')) posStyle.right = '-4px';
                      if (handle === 'n' || handle === 's') posStyle.left = 'calc(50% - 4px)';
                      if (handle === 'e' || handle === 'w') posStyle.top = 'calc(50% - 4px)';

                      return (
                        <div
                          key={handle}
                          className="selection-handle no-print"
                          style={{
                            ...posStyle,
                            cursor: `${handle}-resize`,
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setDragState({
                              mode: 'resize',
                              handle,
                              id: el.id,
                              startX: e.clientX,
                              startY: e.clientY,
                              origX: el.x,
                              origY: el.y,
                              origW: el.width,
                              origH: el.height,
                            });
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
