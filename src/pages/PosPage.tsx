import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  User, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  price: number;
  taxRate: number;
  quantity: number;
  discount: number;
  maxStock: number;
}

export default function PosPage() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // Checkout & Receipt Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load initial catalog & customers
  useEffect(() => {
    loadCatalog('');
    loadCustomers();
    loadSettings();

    // Auto focus barcode scanner input
    barcodeInputRef.current?.focus();

    // Hotkey listeners: F2 focus scanner, F4 checkout, Escape close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setIsCheckoutOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const loadCatalog = async (q: string) => {
    try {
      const res = await api.products.getAll({ search: q, limit: '24' });
      setCatalogProducts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.customers.getAll();
      setCustomers(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.settings.get();
      setShopSettings(res);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Barcode Scanner Input (Pressing Enter or scan gun output)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    try {
      const results = await api.pos.lookup(query);
      if (results && results.length > 0) {
        addToCart(results[0]);
        setBarcodeInput('');
      } else {
        setErrorMsg(`No product found matching barcode "${query}"`);
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lookup failed');
    }
  };

  // Add Product to Cart or increment quantity if already present
  const addToCart = (product: any) => {
    if (product.currentStock <= 0) {
      setErrorMsg(`"${product.name}" is currently out of stock!`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        if (item.quantity + 1 > product.currentStock) {
          setErrorMsg(`Cannot add more than available stock (${product.currentStock} units).`);
          setTimeout(() => setErrorMsg(null), 3000);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...item, quantity: item.quantity + 1 };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            price: product.sellingPrice,
            taxRate: product.taxRate || 0,
            quantity: 1,
            discount: 0,
            maxStock: product.currentStock,
          },
        ];
      }
    });
  };

  // Update Cart Quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) {
              setErrorMsg(`Cannot exceed available stock of ${item.maxStock} units.`);
              setTimeout(() => setErrorMsg(null), 3000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Update Item Discount
  const updateItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, discount: Math.max(0, discount) } : item))
    );
  };

  // Remove Item from Cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculate Order Totals
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity - item.discount), 0);
  const taxAmount = cart.reduce((acc, item) => {
    const lineSubtotal = item.price * item.quantity - item.discount;
    return acc + (lineSubtotal * item.taxRate) / 100;
  }, 0);
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, numCashReceived - totalAmount) : 0;

  // Submit Sale & Checkout
  const handleCompleteSale = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (paymentMethod === 'CASH' && numCashReceived < totalAmount) {
        throw new Error(`Insufficient cash. Total is ₹${totalAmount}, received ₹${numCashReceived}`);
      }

      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        customerId: selectedCustomerId || undefined,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? numCashReceived : totalAmount,
        notes,
      };

      const res = await api.pos.checkout(payload);

      setCompletedSale(res.sale);
      setShopSettings(res.settings);
      setIsCheckoutOpen(false);
      setCart([]);
      setCashReceived('');
      setNotes('');

      // Refresh catalog stock
      loadCatalog(searchQuery);

      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Native Thermal Receipt Print
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT: Product Catalog & Barcode Scanner Panel */}
      <div className="flex-1 flex flex-col border-r border-black/[0.08] bg-[#f5f5f7] overflow-hidden">
        {/* Barcode & Search Topbar */}
        <div className="p-4 border-b border-black/[0.08] bg-white space-y-3">
          {/* Scanner Input with Hotkey reminder */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
                <Barcode size={18} />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode or press F2 to type..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 bg-[#f5f5f7] border border-black/[0.08] rounded-xl text-[#1d1d1f] font-mono text-sm focus:outline-none focus:border-blue-500 shadow-inner"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                AUTO-SCAN
              </span>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#0071e3] hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              Add
            </button>
          </form>

          {/* Search Input for Manual Filtering */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868b]">
              <Search size={15} />
            </div>
            <input
              type="text"
              placeholder="Search catalog by name, model or barcode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadCatalog(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f5f5f7] border border-black/[0.08] rounded-lg text-xs text-[#1d1d1f] placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Product Catalog Cards Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {catalogProducts.map((p) => {
              const inStock = p.currentStock > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    inStock
                      ? 'bg-white border-black/[0.08] hover:border-blue-500 hover:bg-[#f5f5f7] hover:-translate-y-0.5 shadow-sm'
                      : 'bg-[#f5f5f7] border-slate-800 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#86868b] font-mono mb-1">
                      <span>{p.barcode}</span>
                      <span className={p.currentStock <= p.minStockThreshold ? 'text-amber-400 font-bold' : ''}>
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#1d1d1f] line-clamp-2 leading-snug">{p.name}</div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-black/[0.08]/60">
                    <span className="text-sm font-black text-emerald-400">
                      ₹{p.sellingPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10">
                      + ADD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Active Checkout Cart & Billing Summary */}
      <div className="w-96 lg:w-[420px] bg-white flex flex-col justify-between flex-shrink-0">
        {/* Customer Selector & Cart Header */}
        <div className="p-4 border-b border-black/[0.08] bg-[#f5f5f7] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1d1d1f] font-bold text-sm">
              <ShoppingCart size={17} className="text-blue-400" />
              <span>Checkout Register</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono">
              {cart.reduce((a, b) => a + b.quantity, 0)} items
            </span>
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-2">
            <User size={15} className="text-[#86868b] flex-shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-white border border-black/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
            >
              <option value="">Walk-in Customer (General)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Line Items List */}
        <div className="flex-1 p-4 overflow-y-auto divide-y divide-black/[0.06]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#86868b] gap-2">
              <ShoppingCart size={36} className="opacity-40" />
              <div className="text-sm font-semibold">Shopping cart is empty</div>
              <div className="text-xs text-[#86868b]">Scan barcodes or click products on the left</div>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.price * item.quantity - item.discount;
              return (
                <div key={item.productId} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-[#1d1d1f] leading-tight">{item.name}</div>
                      <div className="text-[10px] text-[#86868b] font-mono mt-0.5">
                        ₹{item.price} × {item.quantity} | Tax: {item.taxRate}%
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-[#86868b] hover:text-rose-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-black/[0.08] rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="px-2 py-1 text-[#1d1d1f] hover:bg-[#1f2d4d] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-3 text-xs font-bold text-[#1d1d1f] font-mono">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="px-2 py-1 text-[#1d1d1f] hover:bg-[#1f2d4d] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1d1d1f]">₹{lineTotal.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bill Summary & Complete Checkout Button */}
        <div className="p-4 border-t border-black/[0.08] bg-[#f5f5f7] space-y-3">
          <div className="space-y-1.5 text-xs text-[#86868b]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-[#1d1d1f]">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes (GST):</span>
              <span className="font-mono text-[#1d1d1f]">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-[#1d1d1f] pt-2 border-t border-black/[0.08]">
              <span>Payable Total:</span>
              <span className="text-emerald-400 font-mono">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => {
              setCashReceived(String(totalAmount));
              setIsCheckoutOpen(true);
            }}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-[#1d1d1f] rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Banknote size={18} />
            <span>Proceed to Payment (F4)</span>
          </button>
        </div>
      </div>

      {/* ================= PAYMENT CHECKOUT MODAL ================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-black/[0.08] bg-[#fbfbfd] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f]">Tender & Payment</h3>
                <p className="text-xs text-[#86868b]">Total Payable Amount: ₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-lg text-[#86868b] hover:text-[#1d1d1f] hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Payment Mode Selector */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash Tender', icon: Banknote },
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                    { id: 'CARD', label: 'Card / POS', icon: CreditCard },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === m.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                          : 'bg-white border-black/[0.08] text-[#86868b] hover:text-[#1d1d1f]'
                      }`}
                    >
                      <m.icon size={20} />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Tender & Change Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="p-4 rounded-xl bg-[#f5f5f7] border border-black/[0.08] space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Cash Received (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-lg text-[#1d1d1f] font-mono text-lg font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Fast Denominations */}
                  <div className="flex gap-2">
                    {[totalAmount, 500, 1000, 2000, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(String(val))}
                        className="flex-1 py-1 text-xs rounded bg-[#f5f5f7] hover:bg-[#1e2d4d] text-[#1d1d1f] font-mono"
                      >
                        {val === totalAmount ? 'Exact' : `₹${val}`}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-black/[0.08]">
                    <span className="text-xs text-[#86868b]">Change to Return:</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      ₹{changeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* UPI QR Display */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 rounded-xl bg-[#f5f5f7] border border-black/[0.08] text-center space-y-2">
                  <div className="text-xs text-[#86868b]">Scan store UPI QR code to pay:</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#86868b]">UPI ID: rephonix.pay@icici</div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#86868b] mb-1">Invoice Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Warranty registration or special instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-black/[0.08] rounded-lg text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-black/[0.08] bg-[#fbfbfd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#2b3a54] text-[#1d1d1f] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCompleteSale}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-[#1d1d1f] font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span>{loading ? 'Processing Sale...' : 'Commit & Print Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPLETED INVOICE & THERMAL RECEIPT MODAL ================= */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white text-black rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Action Bar (Non-printed) */}
            <div className="p-3 bg-slate-900 text-[#1d1d1f] flex items-center justify-between no-print">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Sale Completed Successfully!
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setCompletedSale(null)}
                  className="p-1 rounded-lg text-[#86868b] hover:text-[#1d1d1f]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper (80mm / 58mm Thermal standard) */}
            <div className="p-6 overflow-y-auto text-xs font-mono select-all print-only">
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
                <div className="text-base font-extrabold uppercase tracking-wide">
                  {shopSettings?.shopName || 'REPHONIX STORE'}
                </div>
                <div className="text-[10px] text-gray-700 leading-tight">
                  {shopSettings?.address || 'Tech Hub, MG Road, Mumbai'}
                </div>
                <div className="text-[10px] text-gray-700">Phone: {shopSettings?.phone || '+91 98765 43210'}</div>
                {shopSettings?.gstin && (
                  <div className="text-[10px] font-bold text-gray-800">GSTIN: {shopSettings.gstin}</div>
                )}
              </div>

              {/* Meta */}
              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>INVOICE: #{completedSale.invoiceNumber}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cashier: {completedSale.cashier?.fullName || 'Staff'}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {completedSale.customer && (
                  <div className="text-gray-800 font-semibold">
                    Customer: {completedSale.customer.name} ({completedSale.customer.phone || 'N/A'})
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] border-b border-gray-200 pb-1">
                  <span className="flex-1">ITEM</span>
                  <span className="w-10 text-center">QTY</span>
                  <span className="w-14 text-right">TOTAL</span>
                </div>

                {completedSale.items?.map((item: any) => (
                  <div key={item.id} className="space-y-0.5 text-[10px]">
                    <div className="font-semibold text-gray-900">{item.productName}</div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-mono">{item.barcode}</span>
                      <span className="w-10 text-center font-mono">× {item.quantity}</span>
                      <span className="w-14 text-right font-mono font-bold text-gray-900">
                        ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Calculation */}
              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedSale.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST / Tax Total:</span>
                  <span>₹{completedSale.taxAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-300">
                  <span>GRAND TOTAL:</span>
                  <span>₹{completedSale.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700 pt-1">
                  <span>Paid via ({completedSale.paymentMethod}):</span>
                  <span>₹{completedSale.cashReceived?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {completedSale.changeAmount > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-gray-900">
                    <span>Change Returned:</span>
                    <span>₹{completedSale.changeAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Footer Return Policy */}
              <div className="text-center pt-4 space-y-1 text-[9px] text-gray-600">
                <div>{shopSettings?.receiptFooter || 'Thank you for shopping with Rephonix!'}</div>
                <div className="text-[8px] text-gray-400">Powered by Rephonix ShopMaster POS</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
