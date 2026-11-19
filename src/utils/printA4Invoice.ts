/**
 * Dedicated A4 Invoice Print Utility
 * Prints full-page A4 bills in an isolated, hidden iframe so that
 * the main window styles, index.css, and barcode thermal roll @page rules
 * are NEVER touched or changed.
 */

interface PrintInvoiceOptions {
  sale: any;
  shopSettings?: any;
}

export function printA4Invoice({ sale, shopSettings }: PrintInvoiceOptions) {
  if (!sale) return;

  const invoiceNo = sale.invoiceNumber || 'INV-0001';
  const shopName = shopSettings?.shopName || 'REPHONIX';
  const shopAddress = shopSettings?.address || 'Tech Hub, MG Road, Mumbai';
  const shopPhone = shopSettings?.phone || '+91 98765 43210';
  const shopEmail = shopSettings?.email || '';
  const shopGstin = shopSettings?.gstin || '';
  const receiptFooter = shopSettings?.receiptFooter || 'Thank you for shopping with Rephonix! 7-day hassle free replacement on certified devices.';

  const saleDate = new Date(sale.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const saleTime = new Date(sale.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const customerName = sale.customer?.name || 'Walk-in Customer / Retail Cash Sale';
  const customerPhone = sale.customer?.phone ? `Phone: ${sale.customer.phone}` : '';
  const customerAddress = sale.customer?.address || '';
  const cashierName = sale.cashier?.fullName || 'Dhruv (Admin)';
  const paymentMode = sale.paymentMethod || 'CASH';

  const itemsHtml = (sale.items || [])
    .map(
      (item: any, idx: number) => `
      <tr>
        <td style="padding: 8px 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.productName || 'Product'}</div>
          ${item.barcode ? `<div style="font-size: 11px; font-family: monospace; color: #1e40af; margin-top: 2px;">IMEI / Unique Barcode: ${item.barcode}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; text-align: center; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0;">₹${Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">₹${Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `
    )
    .join('');

  const subtotal = Number(sale.subtotal || sale.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const grandTotal = Number(sale.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const amountPaid = Number(sale.cashReceived || sale.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const changeAmount = Number(sale.changeAmount || 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice #${invoiceNo} - ${shopName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      width: 100%;
    }
    .invoice-wrapper {
      width: 100%;
      max-width: 100%;
      padding: 4mm 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
    }
    .shop-title {
      font-size: 26px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .shop-meta {
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
    }
    .badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .inv-number {
      font-size: 15px;
      font-family: monospace;
      font-weight: 900;
      color: #0f172a;
    }
    .grid-meta {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding: 14px 0;
      font-size: 11px;
    }
    .meta-box {
      width: 48%;
    }
    .meta-heading {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
    }
    th {
      border-bottom: 2px solid #0f172a;
      padding: 8px 6px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      border-top: 2px solid #0f172a;
      padding-top: 10px;
    }
    .totals-table {
      width: 280px;
      margin: 0;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
      color: #334155;
    }
    .totals-row.grand {
      font-size: 16px;
      font-weight: 900;
      color: #0071e3;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 4px;
    }
    .footer {
      margin-top: 36px;
      border-top: 1px solid #cbd5e1;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #64748b;
    }
    .sign-box {
      text-align: right;
    }
    .sign-line {
      width: 180px;
      border-bottom: 1px solid #475569;
      margin-bottom: 4px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="header">
      <div>
        <h1 class="shop-title">${shopName}</h1>
        <div class="shop-meta">
          <div>${shopAddress}</div>
          <div>Phone: <strong>${shopPhone}</strong> ${shopEmail ? `| Email: ${shopEmail}` : ''}</div>
          ${shopGstin ? `<div><strong>GSTIN: ${shopGstin}</strong></div>` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="badge">TAX INVOICE / RETAIL BILL</div>
        <div class="inv-number">INVOICE #${invoiceNo}</div>
        <div class="shop-meta" style="margin-top: 4px;">
          <div>Date: <strong>${saleDate}</strong></div>
          <div>Time: <strong>${saleTime}</strong></div>
        </div>
      </div>
    </div>

    <div class="grid-meta">
      <div class="meta-box">
        <div class="meta-heading">CUSTOMER DETAILS (BILL TO)</div>
        <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${customerName}</div>
        ${customerPhone ? `<div>${customerPhone}</div>` : ''}
        ${customerAddress ? `<div>${customerAddress}</div>` : ''}
      </div>
      <div class="meta-box" style="text-align: right;">
        <div class="meta-heading">BILLING & PAYMENT DETAILS</div>
        <div>Cashier / Staff: <strong>${cashierName}</strong></div>
        <div>Payment Mode: <strong>${paymentMode}</strong></div>
        <div>Status: <strong style="color: #047857;">COMPLETED / PAID</strong></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th style="text-align: left;">ITEM DESCRIPTION & SERIAL / IMEI</th>
          <th style="width: 60px; text-align: center;">QTY</th>
          <th style="width: 110px; text-align: right;">RATE (₹)</th>
          <th style="width: 120px; text-align: right;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-area">
      <div class="totals-table">
        <div class="totals-row">
          <span>Sub Total:</span>
          <span style="font-family: monospace; font-weight: 700;">₹${subtotal}</span>
        </div>
        ${
          sale.taxAmount > 0
            ? `<div class="totals-row">
                 <span>GST / Tax:</span>
                 <span style="font-family: monospace; font-weight: 700;">₹${Number(sale.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
               </div>`
            : ''
        }
        <div class="totals-row grand">
          <span style="color: #0f172a;">GRAND TOTAL:</span>
          <span>₹${grandTotal}</span>
        </div>
        <div class="totals-row" style="margin-top: 4px;">
          <span>Amount Paid (${paymentMode}):</span>
          <span style="font-family: monospace; font-weight: 700;">₹${amountPaid}</span>
        </div>
        ${
          changeAmount > 0
            ? `<div class="totals-row" style="color: #047857; font-weight: 700;">
                 <span>Change Returned:</span>
                 <span style="font-family: monospace;">₹${changeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
               </div>`
            : ''
        }
      </div>
    </div>

    <div class="footer">
      <div style="max-width: 60%;">
        <strong style="color: #0f172a; text-transform: uppercase;">Terms & Conditions:</strong>
        <div style="margin-top: 3px;">${receiptFooter}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">* All certified devices are covered under limited warranty as per store policy.</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div style="font-weight: 700; color: #0f172a;">Authorised Signatory</div>
        <div>${shopName}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Create an isolated hidden iframe
  const iframeId = 'a4-invoice-print-frame';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
    setTimeout(() => {
      iframe?.remove();
    }, 2000);
  }, 250);
}
