import { doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants/collectionConstants';

export const nuclearCascadeDelete = async (
  collectionName: keyof typeof COLLECTIONS,
  documentId: string
) => {
  try {
    const batch = writeBatch(db);
    const parentRef = doc(db, COLLECTIONS[collectionName], documentId);

    // If deleting an equipment type (system category), delete its child records first
    if (collectionName === 'EQUIPMENT_TYPES') {
      const recordsQuery = query(
        collection(db, COLLECTIONS.TEST_RECORDS),
        where('equipmentTypeId', '==', documentId)
      );
      
      const recordsSnapshot = await getDocs(recordsQuery);
      
      recordsSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      console.log(`Prepared to delete ${recordsSnapshot.size} child test records for equipment type ${documentId}.`);
    }

    // Add the parent document deletion to the batch
    batch.delete(parentRef);

    // Commit the batch
    await batch.commit();
    console.log(`Successfully completed nuclear cascade delete for ${collectionName}/${documentId}.`);
  } catch (error) {
    console.error(`AGGRESSIVE ERROR LOG: Failed nuclear cascade delete for ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};
