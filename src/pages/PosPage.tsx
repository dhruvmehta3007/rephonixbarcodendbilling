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
import { printA4Invoice } from '../utils/printA4Invoice';

interface CartItem {
  cartItemId: string;
  productId: string;
  deviceUnitId?: string;
  deviceBarcode?: string;
  imei?: string;
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
  
  // Selling Amount Modal State (Prompt for selling price per device)
  const [sellingPriceModal, setSellingPriceModal] = useState<{
    isOpen: boolean;
    product: any;
    scannedImei?: string;
    deviceUnitId?: string;
    sellingAmount: string;
  } | null>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Checkout & Receipt Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keep live references for global hotkeys without re-registering listener or stealing focus
  const sellingPriceModalRef = useRef(sellingPriceModal);
  sellingPriceModalRef.current = sellingPriceModal;
  const isCheckoutOpenRef = useRef(isCheckoutOpen);
  isCheckoutOpenRef.current = isCheckoutOpen;
  const cartLengthRef = useRef(cart.length);
  cartLengthRef.current = cart.length;

  // Auto-focus price input ONLY when modal opens (not on every keystroke)
  const isModalOpen = Boolean(sellingPriceModal?.isOpen);
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // Load initial catalog & customers ONCE on component mount
  useEffect(() => {
    loadCatalog('');
    loadCustomers();
    loadSettings();

    // Auto focus barcode scanner input on initial page load
    barcodeInputRef.current?.focus();
  }, []);

  // Global hotkeys (F2, F4, Esc) registered once
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sellingPriceModalRef.current?.isOpen) {
          setSellingPriceModal(null);
          setTimeout(() => barcodeInputRef.current?.focus(), 50);
        } else if (isCheckoutOpenRef.current) {
          setIsCheckoutOpen(false);
        }
      } else if (e.key === 'F2') {
        if (!sellingPriceModalRef.current?.isOpen && !isCheckoutOpenRef.current) {
          e.preventDefault();
          barcodeInputRef.current?.focus();
          barcodeInputRef.current?.select();
        }
      } else if (e.key === 'F4') {
        if (!sellingPriceModalRef.current?.isOpen && !isCheckoutOpenRef.current) {
          e.preventDefault();
          if (cartLengthRef.current > 0) setIsCheckoutOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        const matched = results[0];
        const imeiFound = matched.deviceImei1 || matched.deviceBarcode || (matched.barcode === query ? query : undefined);
        promptSellingAmount(matched, imeiFound, matched.deviceUnitId);
        setErrorMsg(null);
      } else {
        setErrorMsg(`No phone model found matching scanned IMEI "${query}"`);
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lookup failed');
    }
  };

  // Open Selling Amount Prompt for a Device / Product
  const promptSellingAmount = (product: any, scannedImei?: string, deviceUnitId?: string) => {
    if (product.currentStock <= 0) {
      setErrorMsg(`"${product.name}" is currently out of stock!`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    let resolvedImei = scannedImei || product.deviceImei1 || product.deviceBarcode;
    let resolvedUnitId = deviceUnitId || product.deviceUnitId;

    if (!resolvedUnitId && product.devices && product.devices.length > 0) {
      const availableDev = product.devices.find((d: any) => !cart.some((c) => c.deviceUnitId === d.id));
      if (availableDev) {
        resolvedUnitId = availableDev.id;
        resolvedImei = availableDev.imei1 || availableDev.barcode;
      }
    }

    if (resolvedUnitId && cart.some((c) => c.deviceUnitId === resolvedUnitId)) {
      setErrorMsg(`Device with IMEI "${resolvedImei}" is already added to this bill.`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setSellingPriceModal({
      isOpen: true,
      product,
      scannedImei: resolvedImei,
      deviceUnitId: resolvedUnitId,
      sellingAmount: '',
    });
  };

  // Confirm Selling Amount from Modal and add to Cart
  const confirmAddWithSellingPrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sellingPriceModal) return;

    const rawVal = (sellingPriceModal.sellingAmount ?? '').trim();
    const enteredAmount = rawVal === ''
      ? Number(sellingPriceModal.product.sellingPrice || 0)
      : parseFloat(rawVal);

    if (isNaN(enteredAmount) || enteredAmount < 0) {
      setErrorMsg('Please enter a valid selling amount.');
      return;
    }

    addToCart(
      sellingPriceModal.product,
      sellingPriceModal.scannedImei,
      sellingPriceModal.deviceUnitId,
      enteredAmount
    );

    setSellingPriceModal(null);
    setBarcodeInput('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Add Product to Cart with specified selling amount (no automatic GST)
  const addToCart = (product: any, scannedImei?: string, deviceUnitId?: string, customSellingPrice?: number) => {
    const finalPrice = typeof customSellingPrice === 'number' && !isNaN(customSellingPrice)
      ? customSellingPrice
      : (product.sellingPrice || 0);

    const resolvedImei = scannedImei || product.deviceImei1 || product.deviceBarcode;
    const resolvedUnitId = deviceUnitId || product.deviceUnitId;
    const cartItemId = resolvedUnitId || `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    setCart((prev) => {
      // Check if this exact scanned device unit is already in the cart
      if (resolvedUnitId && prev.some((item) => item.deviceUnitId === resolvedUnitId)) {
        setErrorMsg(`Device with IMEI "${resolvedImei}" is already added to this bill.`);
        setTimeout(() => setErrorMsg(null), 3000);
        return prev;
      }

      // If clicked from grid or general product without specific IMEI and same price
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && !item.deviceUnitId && !resolvedUnitId && item.price === finalPrice
      );
      if (existingIdx >= 0 && !resolvedUnitId) {
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
            cartItemId,
            productId: product.id,
            deviceUnitId: resolvedUnitId,
            deviceBarcode: resolvedImei,
            imei: resolvedImei,
            name: product.name,
            barcode: resolvedImei || product.barcode,
            price: finalPrice,
            taxRate: product.taxRate || defaultRate,
            quantity: 1,
            discount: 0,
            maxStock: product.currentStock,
          },
        ];
      }
    });
  };

  // Update Cart Quantity
  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
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

  // Update Selling Price Directly in Cart Line Item
  const updateItemPrice = (cartItemId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, price: Math.max(0, newPrice) } : item))
    );
  };

  // Update Item Discount
  const updateItemDiscount = (cartItemId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, discount: Math.max(0, discount) } : item))
    );
  };

  // Remove Item from Cart
  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  // Calculate Order Totals with automatic GST breakdown from inclusive selling price
  const defaultRate = shopSettings?.taxRateDefault ?? 18;
  let calculatedTaxableSubtotal = 0;
  let calculatedTaxAmount = 0;
  let totalAmount = 0;

  cart.forEach((item) => {
    const grossLineTotal = item.price * item.quantity - item.discount;
    totalAmount += grossLineTotal;
    const rate = typeof item.taxRate === 'number' && item.taxRate > 0 ? item.taxRate : defaultRate;
    if (rate > 0) {
      const taxable = Math.round((grossLineTotal / (1 + rate / 100)) * 100) / 100;
      const tax = Math.round((grossLineTotal - taxable) * 100) / 100;
      calculatedTaxableSubtotal += taxable;
      calculatedTaxAmount += tax;
    } else {
      calculatedTaxableSubtotal += grossLineTotal;
    }
  });

  calculatedTaxableSubtotal = Math.round(calculatedTaxableSubtotal * 100) / 100;
  calculatedTaxAmount = Math.round(calculatedTaxAmount * 100) / 100;
  totalAmount = Math.round(totalAmount * 100) / 100;
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
          deviceUnitId: i.deviceUnitId,
          deviceBarcode: i.deviceBarcode || i.barcode,
          imei: i.imei || i.barcode,
          quantity: i.quantity,
          unitPrice: i.price,
          sellingPrice: i.price,
          price: i.price,
          discount: i.discount,
          taxRate: i.taxRate || defaultRate,
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

  // Trigger Native A4 Bill Print
  const handlePrintReceipt = () => {
    if (completedSale) {
      printA4Invoice({ sale: completedSale, shopSettings });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f5f5f7]">
      {/* LEFT: Product Catalog & Barcode Scanner Panel */}
      <div className="flex-1 flex flex-col border-r border-black/[0.08] bg-[#f5f5f7] overflow-hidden">
        {/* Barcode & Search Topbar */}
        <div className="p-4 border-b border-black/[0.08] bg-white space-y-3 shadow-xs">
          {/* Scanner Input with Hotkey reminder */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                <Barcode size={20} className="stroke-[2.2]" />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode with handheld scanner or press F2 to type..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-11 pr-28 py-3 bg-[#f5f5f7] hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                AUTO-SCAN
              </span>
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-[#0071e3] hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Add</span>
            </button>
          </form>

          {/* Search Input for Manual Filtering */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} className="stroke-[2.2]" />
            </div>
            <input
              type="text"
              placeholder="Search catalog by name, model or barcode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadCatalog(e.target.value);
              }}
              className="w-full pl-10 pr-3 py-2 bg-[#f5f5f7] border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Product Catalog Cards Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {catalogProducts.map((p) => {
              const inStock = p.currentStock > 0;
              const isLowStock = inStock && p.currentStock <= p.minStockThreshold;

              return (
                <div
                  key={p.id}
                  onClick={() => promptSellingAmount(p)}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                    inStock
                      ? 'bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]'
                      : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    {/* Top Row: Available Stock Pieces Only (No IMEI) */}
                    <div className="flex items-center justify-end mb-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        !inStock
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isLowStock
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {inStock ? `${p.currentStock} ${p.unit}` : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Product Name */}
                    <div className="text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug">
                      {p.name}
                    </div>
                  </div>

                  {/* Bottom Row: Price & Action */}
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <span className="text-base font-black text-slate-900 font-mono tracking-tight">
                      ₹{p.sellingPrice.toLocaleString('en-IN')}
                    </span>
                    {inStock ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promptSellingAmount(p);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <Plus size={13} className="stroke-[2.5]" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Active Checkout Cart & Billing Summary */}
      <div className="w-96 lg:w-[420px] bg-white border-l border-black/[0.08] flex flex-col justify-between flex-shrink-0 shadow-sm">
        {/* Customer Selector & Cart Header */}
        <div className="p-4 border-b border-black/[0.08] bg-[#fbfbfd] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                <ShoppingCart size={15} className="stroke-[2.2]" />
              </div>
              <span>Checkout Register</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono border border-blue-200/60">
              {cart.reduce((a, b) => a + b.quantity, 0)} items
            </span>
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
              <User size={14} className="stroke-[2.2]" />
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-900 font-semibold focus:outline-none cursor-pointer pr-2"
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
        <div className="flex-1 p-4 overflow-y-auto divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner border border-blue-100">
                <ShoppingCart size={30} className="stroke-[2]" />
              </div>
              <div className="text-sm font-bold text-slate-800">Your Cart is Empty</div>
              <div className="text-xs text-slate-500 max-w-[220px]">
                Scan barcodes with your handheld scanner or click items on the left to start billing
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  F2: Scanner
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  F4: Checkout
                </span>
              </div>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.price * item.quantity - item.discount;
              return (
                <div key={item.cartItemId} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate">{item.name}</div>
                      {item.imei && (
                        <div className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-0.5">
                          <span className="text-[9px] text-blue-600 font-sans font-semibold">IMEI:</span>
                          <span className="select-all">{item.imei}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} className="stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Selling Price Input & Quantity Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Editable Selling Price for this Device */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Price:</span>
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-xs font-black text-slate-500">₹</span>
                        <input
                          type="number"
                          step="any"
                          value={item.price}
                          onChange={(e) => updateItemPrice(item.cartItemId, parseFloat(e.target.value) || 0)}
                          className="w-24 pl-5 pr-1.5 py-1 bg-[#f5f5f7] hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                          title="Click to edit selling price for this device"
                        />
                      </div>
                    </div>

                    {/* Quantity or Line Total */}
                    <div className="flex items-center gap-2">
                      {!item.deviceUnitId && (
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-xs">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="px-2 py-0.5 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                          >
                            <Minus size={11} className="stroke-[2.5]" />
                          </button>
                          <span className="px-2 text-xs font-black text-slate-900 font-mono bg-white py-0.5">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="px-2 py-0.5 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                          >
                            <Plus size={11} className="stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 font-mono">₹{lineTotal.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bill Summary & Complete Checkout Button */}
        <div className="p-4 border-t border-black/[0.08] bg-[#fbfbfd] space-y-3.5">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900">₹{calculatedTaxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Included:</span>
              <span className="font-mono font-semibold text-emerald-700">₹{calculatedTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Payable Total:</span>
              <span className="text-2xl font-black text-[#0071e3] font-mono tracking-tight">
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
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
              cart.length > 0
                ? 'bg-[#0071e3] hover:bg-blue-600 text-white shadow-blue-600/30 cursor-pointer active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Banknote size={18} className="stroke-[2.2]" />
            <span>Proceed to Payment (F4)</span>
          </button>
        </div>
      </div>

      {/* ================= SELLING AMOUNT INPUT MODAL ================= */}
      {sellingPriceModal && sellingPriceModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enter Selling Amount</h3>
                  <p className="text-[11px] text-slate-500">Input device selling price</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSellingPriceModal(null);
                  barcodeInputRef.current?.focus();
                }}
                className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={confirmAddWithSellingPrice} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {sellingPriceModal.product.name}
                </div>
                {sellingPriceModal.scannedImei && (
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <span className="text-[10px] text-blue-600 font-sans font-semibold">IMEI:</span>
                    <span>{sellingPriceModal.scannedImei}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 font-mono">
                  Catalog MRP: ₹{sellingPriceModal.product.sellingPrice?.toLocaleString('en-IN') || 0}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selling Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-500">
                    ₹
                  </span>
                  <input
                    ref={priceInputRef}
                    type="number"
                    step="any"
                    inputMode="numeric"
                    value={sellingPriceModal.sellingAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSellingPriceModal((prev) => (prev ? { ...prev, sellingAmount: val } : null));
                    }}
                    placeholder={String(sellingPriceModal.product.sellingPrice || '0')}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-slate-300 focus:border-blue-600 rounded-xl font-mono text-xl font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Type new selling amount directly, or press Enter to accept ₹{sellingPriceModal.product.sellingPrice?.toLocaleString('en-IN') || 0}. No GST added.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSellingPriceModal(null);
                    barcodeInputRef.current?.focus();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0071e3] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} className="stroke-[2.5]" />
                  <span>Add to Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PAYMENT CHECKOUT MODAL ================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-[#fbfbfd] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tender & Payment</h3>
                <p className="text-xs text-slate-500">Total Payable Amount: ₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Payment Mode Selector */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'CASH', label: 'Cash Tender', icon: Banknote },
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                    { id: 'CARD', label: 'Card / POS', icon: CreditCard },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <m.icon size={22} className="stroke-[2.2]" />
                      <span className="text-xs font-semibold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Tender & Change Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cash Received (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Fast Denominations */}
                  <div className="flex gap-2">
                    {[totalAmount, 500, 1000, 2000, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(String(val))}
                        className="flex-1 py-1 text-xs rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold font-mono border border-slate-200 transition-colors cursor-pointer"
                      >
                        {val === totalAmount ? 'Exact' : `₹${val}`}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-xs font-semibold text-slate-600">Change to Return:</span>
                    <span className="text-lg font-black text-amber-600 font-mono">
                      ₹{changeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* UPI QR Display */}
              {paymentMethod === 'UPI' && (
                <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-200 text-center space-y-2">
                  <div className="text-xs font-semibold text-slate-600">Scan store UPI QR code to pay:</div>
                  <div className="text-2xl font-black text-blue-700 font-mono">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">UPI ID: rephonix.pay@icici</div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Warranty registration or special instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-[#fbfbfd] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCompleteSale}
                className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={16} className="stroke-[2.2]" />
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
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-slate-900 flex items-center justify-between no-print">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Sale Completed Successfully!
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="px-4 py-1.5 bg-[#0071e3] hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print A4 Invoice</span>
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
                    {item.barcode && (
                      <div className="text-[9px] font-mono text-slate-700 font-semibold">
                        IMEI: {item.barcode}
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span className="font-mono">₹{item.unitPrice?.toLocaleString('en-IN') || ''}</span>
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
                {completedSale.taxAmount > 0 ? (
                  <div className="flex justify-between">
                    <span>GST / Tax Total:</span>
                    <span>₹{completedSale.taxAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>GST / Taxes:</span>
                    <span>₹0.00</span>
                  </div>
                )}
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
