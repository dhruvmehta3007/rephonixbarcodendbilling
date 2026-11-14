import { prisma } from './db';
import { firestore } from './firebase';

export async function syncAllToFirestore() {
  if (!firestore) {
    console.log('[Firestore] Firestore not initialized, skipping sync.');
    return;
  }

  console.log('🔄 [Firestore] Starting initial sync of all data to Cloud Firestore...');

  try {
    // 1. Settings
    const settings = await prisma.shopSettings.findMany();
    for (const s of settings) {
      await firestore.collection('shop_settings').doc(s.id).set(JSON.parse(JSON.stringify(s)), { merge: true });
    }

    // 2. Categories
    const categories = await prisma.category.findMany();
    for (const c of categories) {
      await firestore.collection('categories').doc(c.id).set(JSON.parse(JSON.stringify(c)), { merge: true });
    }

    // 3. Suppliers
    const suppliers = await prisma.supplier.findMany();
    for (const s of suppliers) {
      await firestore.collection('suppliers').doc(s.id).set(JSON.parse(JSON.stringify(s)), { merge: true });
    }

    // 4. Products & Barcodes
    const products = await prisma.product.findMany();
    for (const p of products) {
      await firestore.collection('products').doc(p.id).set(JSON.parse(JSON.stringify(p)), { merge: true });
    }

    // 5. Tracked Device Units & Barcodes
    const devices = await prisma.deviceUnit.findMany();
    for (const d of devices) {
      await firestore.collection('devices').doc(d.id).set(JSON.parse(JSON.stringify(d)), { merge: true });
    }

    // 6. Customers
    const customers = await prisma.customer.findMany();
    for (const c of customers) {
      await firestore.collection('customers').doc(c.id).set(JSON.parse(JSON.stringify(c)), { merge: true });
    }

    // 7. Inventory Movements
    const movements = await prisma.inventoryMovement.findMany();
    for (const m of movements) {
      await firestore.collection('inventory_movements').doc(m.id).set(JSON.parse(JSON.stringify(m)), { merge: true });
    }

    // 8. Sales
    const sales = await prisma.sale.findMany({ include: { items: true } });
    for (const s of sales) {
      await firestore.collection('sales').doc(s.id).set(JSON.parse(JSON.stringify(s)), { merge: true });
    }

    console.log(`✅ [Firestore] All data synced: ${products.length} products, ${devices.length} devices, ${categories.length} categories.`);
  } catch (err: any) {
    console.error('❌ [Firestore Sync Error]:', err.message);
  }
}
