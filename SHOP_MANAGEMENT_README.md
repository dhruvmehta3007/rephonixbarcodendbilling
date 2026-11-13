# Rephonix ShopMaster — Retail POS, Inventory & Barcode Suite

A complete, production-grade Shop Management System built for single retail stores, electronics shops, and mobile phone retailers.

---

## 1. System Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Zod validation, JWT authentication, bcryptjs
- **Database & ORM**: PostgreSQL / SQLite with Prisma ORM
- **Barcode & Printing**: Code 128, EAN-13, vector SVG rendering via `bwip-js`, native ESC/POS thermal receipt formatting, and the full interactive **Rephonix BarTender Label Studio** (WYSIWYG millimeter canvas, Zebra ZPL II, TSC TSPL, WebSerial hardware connection)
- **Testing**: Vitest + Supertest automated testing suite covering all critical retail operations

---

## 2. Key Modules & Functional Workflows

### 📊 Professional Admin Dashboard
- **Live Metrics**: Total Products, Total Inventory Units, Today's Gross Sales, Number of Transactions Today.
- **Critical Stock Warnings**: Real-time identification of low-stock and out-of-stock items.
- **7-Day Revenue Trend**: Daily bar chart comparing sales and transaction volume over the past week.
- **Recent Transactions**: Quick invoice lookup and customer attribution.

### 🛒 Point of Sale (POS) Billing Counter
- **Keyboard-First Interface**:
  - `F2`: Instant focus on the barcode scanner search input.
  - `F4`: Immediate checkout modal trigger.
  - `Enter`: Instant barcode lookup and add to cart.
- **Barcode Scanner Support**: Plug-and-play USB/Bluetooth barcode scanner compatible. Repeated scans automatically increment item quantity.
- **Server-Side Financial Accuracy**: Line subtotals, item discounts, applicable tax (GST), and grand totals are computed server-side to prevent manipulation.
- **Tender Methods**: Cash (with instant change calculation and quick denomination buttons `Exact`, `₹500`, `₹1000`, `₹2000`), UPI QR code, and Card.
- **Thermal Receipt Printer**: Generates 58mm / 80mm standard thermal receipts with store header, GSTIN, invoice number, line items, tax breakdown, and return policy.

### 📦 Product & Catalog Management
- Complete CRUD with unique SKU enforcement and duplicate barcode collision prevention.
- Filter by Category, Stock Status (In Stock, Low Stock, Out of Stock), and multi-criteria sorting.
- **Bulk CSV Import**: Drag & drop CSV spreadsheets with automatic opening inventory ledger generation.
- **CSV Export**: One-click catalog export.
- **Soft Delete / Archival**: Archived products preserve all historical transaction integrity.

### 📋 Inventory Control & Immutable Movement Ledger
- **Atomic Stock Deductions**: Deducts stock only when sale is committed inside a database transaction.
- **Negative Stock Prevention**: Configurable setting prevents overselling when inventory reaches zero.
- **Manual Stock Adjustments**: Allows positive/negative stock corrections requiring mandatory audit reason codes (`ADJUSTMENT`, `DAMAGE`, `RETURN`, `PURCHASE`).
- **Complete Audit Ledger**: Immutable record of every stock change showing timestamp, user responsible, quantity change, stock before, and stock after.

### 🏷️ Barcode Generation & WYSIWYG Label Studio
- **Batch Inventory Barcode Printing**: Select multiple catalog products, define print quantities, choose standard label sizes (50×25mm, 50×30mm, 40×25mm), and print vector SVG labels.
- **Rephonix BarTender Studio**: Full WYSIWYG label designer featuring millimeter rulers, drag & drop canvas, layers, dynamic variables (`{{imei1}}`, `{{serial}}`, `{{price}}`), pre-built mobile IMEI stickers, Zebra ZPL II, and TSC TSPL machine code export.

### 🧾 Sales History & Controlled Refunds
- Full invoice history with date filters and customer search.
- **Controlled Refund Workflow**: Atomically marks invoice as `REFUNDED`, restores inventory quantities for all returned items, and records `RETURN` ledger entries.

### 📈 Business Reports & P&L Analysis
- **Financial Statement**: Total Gross Sales, Discounts Given, Net Revenue, Cost of Goods Sold (COGS), Estimated Gross Profit, and Gross Margin %.
- **Payment Settlement Breakdown**: Distribution of revenue across Cash, UPI, and Card.
- **Product Profitability**: Ranking of best-selling products by quantity, revenue, and gross margin.
- **Inventory Asset Valuation**: Breakdown of store stock at cost value vs retail value and potential profit.

### 👥 Staff Roles & Audit Logging
- **Role-Based Access Control**:
  - `ADMIN`: Full access to settings, reports, staff management, product CRUD, and refunds.
  - `CASHIER`: Checkout counter billing, product lookup, permitted sales records, and receipt printing.
- **Security Audit Trail**: Tracks all user logins, sales creations, refunds, and manual inventory adjustments with timestamps and IP addresses.

---

## 3. Getting Started

### Default Login Accounts
| Role | Username | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full Store Manager Privileges |
| **Cashier** | `cashier` | `cashier123` | POS Billing & Customer Lookup |

### Running the Application
```bash
# Install dependencies
npm install

# Apply database schema
npx prisma db push

# Seed initial retail catalog, demo users, and store settings
npm run seed

# Run automated tests
npm test

# Start both Express backend and Vite frontend concurrently
npm run dev
```

The system will start:
- **Web Frontend**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5001/api`

---

## 4. Production PostgreSQL Deployment
To switch from local development to production PostgreSQL:
1. In `.env`, update the `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/rephonix_pos?schema=public"
   ```
2. In `prisma/schema.prisma`, update the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run migrations:
   ```bash
   npx prisma db push
   npm run seed
   ```
