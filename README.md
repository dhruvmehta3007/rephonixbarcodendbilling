# CellPoint Barcode - POS & Device Barcode Management Suite

Smart Retail POS, Barcode Generation Studio, and systematic Device Tracker.

---

## 🚀 Setup & Run on Any Machine

When you clone this project onto a new computer, follow these quick steps:

### 1. Clone the repository
```bash
git clone https://github.com/dhruvmehta3007/thecellpointbarcode.git
cd thecellpointbarcode
```

### 2. Install Dependencies
```bash
npm install
```
*(This will automatically run `prisma generate` to configure your Prisma client).*

### 3. Setup Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
*(Or create a `.env` file with `DATABASE_URL="file:./dev.db"` and `JWT_SECRET=your_secret`).*

### 4. Initialize Database & Seed Default Accounts
```bash
npm run db:setup
```
*(Or run `npx prisma db push && npm run seed`).*

This will create the SQLite database (`dev.db`) and seed the default accounts and store settings:
- **Admin**: `admin` / `admin123` (Name: Dhruv)
- **Cashier**: `cashier` / `cashier123`

### 5. Start the Application
```bash
npm run dev
```

This starts both:
- **Frontend (Vite UI)** at `http://localhost:5173`
- **Backend (Express API)** at `http://localhost:5001`
