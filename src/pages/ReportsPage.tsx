import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  DollarSign, 
  Percent, 
  Layers, 
  Boxes,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../services/api';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'products' | 'valuation'>('financial');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Report Data
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [productSales, setProductSales] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, [startDate, endDate, activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'financial') {
        const res = await api.reports.getSalesSummary({ startDate, endDate });
        setSalesSummary(res);
      } else if (activeTab === 'products') {
        const res = await api.reports.getProductSales();
        setProductSales(res || []);
      } else if (activeTab === 'valuation') {
        const res = await api.reports.getInventoryValuation();
        setValuation(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    let dataToExport: any[] = [];
    let filename = 'report.csv';

    if (activeTab === 'financial' && salesSummary) {
      dataToExport = [salesSummary.summary];
      filename = `rephonix_financial_summary_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab === 'products') {
      dataToExport = productSales;
      filename = `rephonix_product_profitability_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab === 'valuation' && valuation) {
      dataToExport = valuation.items;
      filename = `rephonix_inventory_valuation_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (dataToExport.length === 0) return;

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Business Intelligence & Reports</h1>
          <p className="text-sm text-[#86868b]">
            Financial analytics, gross margin profit calculations, and asset inventory valuation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-[#f5f5f7] hover:bg-[#1e2d4d] border border-black/[0.08] text-[#1d1d1f] rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadReports}
            title="Refresh"
            className="p-2 bg-[#f5f5f7] hover:bg-[#1e2d4d] border border-black/[0.08] text-[#1d1d1f] rounded-xl transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Tabs & Date Filters */}
      <div className="p-4 rounded-2xl bg-white border border-black/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-[#f5f5f7] p-1 rounded-xl border border-black/[0.08]">
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'financial' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Financial & Gross Margin
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'products' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Product Profitability
          </button>
          <button
            onClick={() => setActiveTab('valuation')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'valuation' ? 'bg-[#0071e3] text-white shadow-md' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Inventory Asset Valuation
          </button>
        </div>

        {activeTab === 'financial' && (
          <div className="flex items-center gap-2 text-xs text-[#86868b]">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#f5f5f7] border border-black/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-[#1d1d1f] focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* ================= TAB 1: FINANCIAL & GROSS MARGIN ================= */}
      {activeTab === 'financial' && salesSummary && (
        <div className="space-y-6">
          {/* KPI Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">Total Net Revenue</div>
              <div className="text-2xl font-black text-[#1d1d1f] font-mono">
                ₹{salesSummary.summary.totalNetRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#86868b] mt-1">Across {salesSummary.summary.totalOrders} order(s)</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">Cost of Goods Sold (COGS)</div>
              <div className="text-2xl font-black text-[#1d1d1f] font-mono">
                ₹{salesSummary.summary.totalCostOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#86868b] mt-1">Direct supplier acquisition cost</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">Estimated Gross Profit</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{salesSummary.summary.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1 font-semibold">
                <TrendingUp size={13} />
                <span>Margin: {salesSummary.summary.profitMargin}%</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">Tax Collected (GST)</div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                ₹{salesSummary.summary.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#86868b] mt-1">Discounts given: ₹{salesSummary.summary.totalDiscount}</div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="p-6 rounded-2xl bg-white border border-black/[0.08]">
            <h2 className="text-base font-bold text-[#1d1d1f] mb-4">Payment Methods Settlement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(salesSummary.paymentMethods || {}).map(([method, data]: [string, any]) => (
                <div key={method} className="p-4 rounded-xl bg-[#f5f5f7] border border-black/[0.08]">
                  <div className="text-xs font-bold text-[#86868b] uppercase tracking-wider">{method}</div>
                  <div className="text-xl font-black text-[#1d1d1f] font-mono mt-1">
                    ₹{data.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#86868b] mt-0.5">{data.count} transaction(s)</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PRODUCT PROFITABILITY ================= */}
      {activeTab === 'products' && (
        <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                <tr>
                  <th className="p-4">PRODUCT NAME</th>
                  <th className="p-4">BARCODE</th>
                  <th className="p-4 text-center">QUANTITY SOLD</th>
                  <th className="p-4 text-right">TOTAL REVENUE</th>
                  <th className="p-4 text-right">TOTAL COST (COGS)</th>
                  <th className="p-4 text-right">GROSS PROFIT</th>
                  <th className="p-4 text-center">MARGIN %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                {productSales.map((p) => (
                  <tr key={p.productId} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="p-4 font-semibold text-[#1d1d1f]">{p.name}</td>
                    <td className="p-4 font-mono text-blue-400">{p.barcode}</td>
                    <td className="p-4 text-center font-mono font-bold text-[#1d1d1f]">{p.quantitySold}</td>
                    <td className="p-4 text-right font-mono text-[#1d1d1f]">
                      ₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono text-[#86868b]">
                      ₹{p.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      ₹{p.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-400">{p.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: INVENTORY VALUATION ================= */}
      {activeTab === 'valuation' && valuation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Total Stock Valuation (Cost Basis)
              </div>
              <div className="text-2xl font-black text-[#1d1d1f] font-mono">
                ₹{valuation.summary.totalCostValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#86868b] mt-1">{valuation.summary.totalQuantity} total inventory units</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Retail Selling Valuation
              </div>
              <div className="text-2xl font-black text-[#1d1d1f] font-mono">
                ₹{valuation.summary.totalRetailValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#86868b] mt-1">If all current inventory is sold</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-1">
                Potential Gross Margin
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{valuation.summary.potentialGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-400/80 mt-1">Projected unrealized store profit</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-black/[0.08] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbfbfd] text-[#1d1d1f] font-semibold border-b border-black/[0.08]">
                  <tr>
                    <th className="p-4">PRODUCT</th>
                    <th className="p-4">BARCODE</th>
                    <th className="p-4 text-center">STOCK</th>
                    <th className="p-4 text-right">UNIT COST</th>
                    <th className="p-4 text-right">RETAIL PRICE</th>
                    <th className="p-4 text-right">TOTAL COST VALUE</th>
                    <th className="p-4 text-right">TOTAL RETAIL VALUE</th>
                    <th className="p-4 text-right">POTENTIAL PROFIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] text-[#1d1d1f]">
                  {valuation.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[#f5f5f7] transition-colors">
                      <td className="p-4 font-semibold text-[#1d1d1f]">{item.name}</td>
                      <td className="p-4 font-mono text-blue-400">{item.barcode}</td>
                      <td className="p-4 text-center font-mono font-bold text-[#1d1d1f]">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="p-4 text-right font-mono text-[#86868b]">
                        ₹{item.purchasePrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-[#1d1d1f]">
                        ₹{item.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right font-mono text-[#1d1d1f]">
                        ₹{item.costValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400">
                        ₹{item.retailValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400">
                        ₹{item.potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
