import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs a sensitive action to the AuditLogs collection for compliance tracking.
 * @param recordId The ID of the document being modified
 * @param actionType The type of action (e.g., 'CREATE_RECORD', 'UPDATE_STATUS')
 * @param userId The ID of the authenticated user performing the action
 * @param changes An object containing the delta or the resulting state of the change
 */
export async function logAuditAction(
  recordId: string,
  actionType: string,
  userId: string,
  changes: any
) {
  try {
    await addDoc(collection(db, 'AuditLogs'), {
      recordId,
      actionType,
      userId,
      changes,
      timestamp: serverTimestamp(),
      system: 'RIL-HMD-FPS'
    });
  } catch (error) {
    console.error('Silent Auditor Error: Failed to write to AuditLogs', error);
  }
}
