import React, { useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

export const DataSweeper = () => {
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<{ type: 'success' | 'error'; message: string; count?: number } | null>(null);

  const cleanOrphanedSchedules = async () => {
    // Removed window.confirm bypass sandbox restrictions

    setIsSweeping(true);
    setSweepResult(null);

    try {
      // 1. Fetch ALL current entities that could be parents (Categories, Subsystems, Plants)
      const categoriesReq = await getDocs(collection(db, 'categories'));
      const activeCategoryIds = new Set(categoriesReq.docs.map(d => d.id));

      const subSystemsReq = await getDocs(collection(db, 'subsystems'));
      const activeSubSystemIds = new Set(subSystemsReq.docs.map(d => d.id));

      const plantsReq = await getDocs(collection(db, 'plants'));
      const activePlantIds = new Set(plantsReq.docs.map(d => d.id));

      // 2. Fetch ALL schedule records
      const recordsReq = await getDocs(collection(db, 'testRecords'));
      
      const orphanedRecordRefs: any[] = [];
      let deletedCount = 0;

      recordsReq.docs.forEach(document => {
        const data = document.data();
        let isOrphaned = false;

        // Check if the associated Category exists
        if (data.categoryId && !activeCategoryIds.has(data.categoryId)) {
          isOrphaned = true;
        }
        
        // Check if the associated SubSystem exists
        if (data.subSystemId && !activeSubSystemIds.has(data.subSystemId)) {
          isOrphaned = true;
        }

        // Check if the associated Plant exists
        if (data.plantId && !activePlantIds.has(data.plantId)) {
          isOrphaned = true;
        }

        if (isOrphaned) {
          orphanedRecordRefs.push(document.ref);
        }
      });

      // 3. Execute batch delete in chunks of 500 (Firestore limit is 500 per batch)
      const chunkSize = 500;
      for (let i = 0; i < orphanedRecordRefs.length; i += chunkSize) {
        const chunk = orphanedRecordRefs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(ref => {
          batch.delete(ref);
        });
        await batch.commit();
        deletedCount += chunk.length;
      }

      setSweepResult({ 
        type: 'success', 
        message: `Successfully cleaned database.`,
        count: deletedCount
      });
      // Removed alert
    } catch (error: any) {
      console.error("Error during data sweep:", error);
      setSweepResult({ type: 'error', message: error?.message || 'An error occurred during sweeping.' });
      // Removed alert
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-white p-2 rounded-xl text-red-600 shadow-sm border border-red-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-black text-red-900 uppercase tracking-widest">Database Maintenance: Ghost Data Sweeper</h3>
          <p className="text-xs font-bold text-red-700 mt-1 uppercase tracking-wider">
            Find and permanently delete test records associated with deleted systems/equipment.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 border border-red-100 mb-6 flex flex-col sm:flex-row justify-between items-center">
        <p className="text-xs text-gray-500 font-bold mb-4 sm:mb-0">
          This operation will scan the entire database, cross-reference schedules against active systems, and batch delete the orphans.
        </p>
        <Button 
          onClick={cleanOrphanedSchedules} 
          disabled={isSweeping}
          className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 shrink-0 shadow-md shadow-red-500/20"
        >
          {isSweeping ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
              Sweeping Data...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Trash2 className="h-3 w-3" />
              Sweep Orphaned Data
            </span>
          )}
        </Button>
      </div>

      {sweepResult && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border text-xs font-bold ${
          sweepResult.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'
        }`}>
          {sweepResult.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {sweepResult.type === 'success' ? (
            <span>{sweepResult.message} <strong>Deleted {sweepResult.count} records.</strong></span>
          ) : (
            <span>{sweepResult.message}</span>
          )}
        </div>
      )}
    </div>
  );
};
