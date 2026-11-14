import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app: App;
let firestoreDb: Firestore;

try {
  if (getApps().length === 0) {
    let serviceAccount: any = null;

    // Check environment variable (for Render production) or local file
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env variable');
      }
    }

    if (!serviceAccount) {
      const keyPath = path.resolve(__dirname, '../serviceAccountKey.json');
      if (fs.existsSync(keyPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      }
    }

    if (serviceAccount) {
      app = initializeApp({ credential: cert(serviceAccount) });
      firestoreDb = getFirestore(app);
      console.log('🔥 Firebase Admin Firestore initialized successfully');
    } else {
      console.warn('⚠️ No Firebase service account credentials found.');
    }
  } else {
    app = getApps()[0];
    firestoreDb = getFirestore(app);
  }
} catch (error) {
  console.error('Error initializing Firebase Firestore:', error);
}

export const firestore = firestoreDb!;
export default firestore;
