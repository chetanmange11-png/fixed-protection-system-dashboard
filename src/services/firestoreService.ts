import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  DocumentData,
  WithFieldValue
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants/collectionConstants';

export const createDocument = async <T extends WithFieldValue<DocumentData>>(
  collectionName: keyof typeof COLLECTIONS, 
  data: T
) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS[collectionName]), data);
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async <T extends UpdateData<DocumentData>>(
  collectionName: keyof typeof COLLECTIONS, 
  documentId: string, 
  data: T
) => {
  try {
    const docRef = doc(db, COLLECTIONS[collectionName], documentId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

export const deleteDocument = async (
  collectionName: keyof typeof COLLECTIONS, 
  documentId: string
) => {
  try {
    const docRef = doc(db, COLLECTIONS[collectionName], documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`AGGRESSIVE ERROR LOG: Failed to delete document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collectionName: keyof typeof COLLECTIONS;
  documentId?: string;
  data?: any;
}

export const batchUpdate = async (operations: BatchOperation[]) => {
  try {
    const batch = writeBatch(db);
    
    operations.forEach((op) => {
      const colPath = COLLECTIONS[op.collectionName];
      
      if (op.type === 'create') {
        const docRef = doc(collection(db, colPath));
        batch.set(docRef, op.data);
      } else if (op.type === 'update') {
        if (!op.documentId) throw new Error('Update operation requires documentId');
        const docRef = doc(db, colPath, op.documentId);
        batch.update(docRef, op.data);
      } else if (op.type === 'delete') {
        if (!op.documentId) throw new Error('Delete operation requires documentId');
        const docRef = doc(db, colPath, op.documentId);
        batch.delete(docRef);
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Batch update failed:', error);
    throw error;
  }
};

// Internal type helper for updateDoc
type UpdateData<T> = { [K in keyof T]?: T[K] | any };
