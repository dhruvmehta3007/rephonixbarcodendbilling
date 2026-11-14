import { firestore } from '../firebase';

/**
 * Helper to safely sync any record to a Firestore collection in the background
 */
export async function syncToFirestore(collectionName: string, docId: string, data: any) {
  if (!firestore) return;
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    await firestore.collection(collectionName).doc(String(docId)).set({
      ...cleanData,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err: any) {
    console.error(`[Firestore Sync] Failed to sync ${collectionName}/${docId}:`, err.message);
  }
}

/**
 * Helper to delete a document from Firestore when deleted locally
 */
export async function deleteFromFirestore(collectionName: string, docId: string) {
  if (!firestore) return;
  try {
    await firestore.collection(collectionName).doc(String(docId)).delete();
  } catch (err: any) {
    console.error(`[Firestore Sync] Failed to delete ${collectionName}/${docId}:`, err.message);
  }
}
