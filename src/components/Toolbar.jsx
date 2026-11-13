import React, { useRef } from 'react';
import { 
  MousePointer, 
  Barcode, 
  QrCode, 
  Type, 
  Braces, 
  Square, 
  Minus, 
  Award, 
  Image as ImageIcon,
  Smartphone
} from 'lucide-react';

export default function Toolbar({ activeTool, setActiveTool, onAddElement }) {
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onAddElement({
        type: 'image',
        content: event.target.result,
        width: 20,
        height: 15,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <aside className="left-toolbar">
      {/* Pointer / Select Tool */}
      <button
        className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setActiveTool('select')}
        title="Select & Move (V)"
      >
        <MousePointer size={18} />
        <span>Select</span>
      </button>

      <div style={{ width: '36px', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* 1D Barcode */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'barcode',
            symbology: 'code128',
            content: 'REPHONIX-1001',
            width: 35,
            height: 12,
            showText: true,
          })
        }
        title="Add 1D Barcode (Code128 / EAN13)"
      >
        <Barcode size={20} color="#38bdf8" />
        <span>Barcode</span>
      </button>

      {/* 2D QR Code */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'qrcode',
            content: 'https://rephonix.in',
            width: 14,
            height: 14,
          })
        }
        title="Add 2D QR Code"
      >
        <QrCode size={19} color="#818cf8" />
        <span>QR Code</span>
      </button>

      {/* Text Element */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'text',
            content: 'Text Label',
            width: 30,
            height: 5,
            fontSize: 9,
            fontWeight: '600',
            fontFamily: 'Inter',
            textAlign: 'left',
          })
        }
        title="Add Text Label"
      >
        <Type size={19} color="#34d399" />
        <span>Text</span>
      </button>

      {/* Mobile IMEI Block Preset */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'barcode',
            symbology: 'code128',
            content: '{{imei1}}',
            width: 40,
            height: 9,
            showText: false,
          })
        }
        title="Add IMEI Barcode Block"
      >
        <Smartphone size={19} color="#fbbf24" />
        <span>IMEI Bar</span>
      </button>

      {/* Variable Field */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'text',
            content: '{{serial}}',
            width: 25,
            height: 4,
            fontSize: 8,
            fontWeight: 'bold',
            fontFamily: 'JetBrains Mono',
            color: '#000000',
          })
        }
        title="Add Dynamic Variable {{field}}"
      >
        <Braces size={19} color="#f472b6" />
        <span>Variable</span>
      </button>

      <div style={{ width: '36px', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Shapes: Rect */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'rect',
            width: 30,
            height: 15,
            borderWidth: 0.5,
            borderRadius: 1,
            fill: 'transparent',
          })
        }
        title="Add Border Box / Rectangle"
      >
        <Square size={18} color="#a3e635" />
        <span>Box</span>
      </button>

      {/* Shapes: Line */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'line',
            width: 40,
            height: 0.5,
            borderWidth: 0.5,
          })
        }
        title="Add Divider Line"
      >
        <Minus size={18} color="#94a3b8" />
        <span>Line</span>
      </button>

      {/* Badge (QC Pass, Grade A) */}
      <button
        className="tool-btn"
        onClick={() =>
          onAddElement({
            type: 'badge',
            content: 'QC PASS',
            width: 16,
            height: 4.5,
            borderWidth: 0.6,
            borderRadius: 1,
          })
        }
        title="Add QC Passed / Status Badge"
      >
        <Award size={18} color="#f87171" />
        <span>Badge</span>
      </button>

      {/* Image / Logo Upload */}
      <button
        className="tool-btn"
        onClick={() => fileInputRef.current?.click()}
        title="Upload Company Logo / Icon"
      >
        <ImageIcon size={18} color="#38bdf8" />
        <span>Logo</span>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </aside>
  );
}
