import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import posRoutes from './routes/pos.routes';
import salesRoutes from './routes/sales.routes';
import categoryRoutes from './routes/category.routes';
import supplierRoutes from './routes/supplier.routes';
import customerRoutes from './routes/customer.routes';
import reportsRoutes from './routes/reports.routes';
import settingsRoutes from './routes/settings.routes';
import usersRoutes from './routes/users.routes';
import deviceRoutes from './routes/device.routes';
import printRoutes from './routes/print.routes';
import partnerRoutes from './routes/partner.routes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = Number(process.env.PORT) || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Rephonix Shop Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/print', printRoutes);
app.use('/api/partner', partnerRoutes);

// Serve frontend static assets in production
const clientDistPath = path.resolve(__dirname, '../dist');
app.use(express.static(clientDistPath));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  next();
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

import { syncAllToFirestore } from './syncAll';
import { ensurePermanentCredentials } from './initPermanentAccounts';

// Start listening if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Rephonix Shop Management Server running on port ${PORT}`);
    console.log(`📡 API available at http://0.0.0.0:${PORT}/api`);
    
    // Ensure permanent partner & shop owner credentials are alive and never lost
    await ensurePermanentCredentials();

    // Non-blocking sync to Firebase Firestore
    syncAllToFirestore().catch(err => console.error('Initial Firebase sync failed:', err.message));
  });
}

export default app;
