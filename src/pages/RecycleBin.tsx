import * as React from 'react';
import { Trash2, RefreshCcw, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useLiveSync } from '../hooks/useLiveSync';
import { createDocument, deleteDocument } from '../services/firestoreService';

export default function RecycleBin() {
  const { data: recycleBinRecords, loading, error } = useLiveSync<any>('RECYCLE_BIN');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(recycleBinRecords.map((r: any) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    const tId = toast.loading('Restoring selected records...');
    try {
      const recordsToRestore = recycleBinRecords.filter((r: any) => selectedIds.includes(r.id));
      for (const record of recordsToRestore) {
        const { deletedAt, originalCollection, id, ...originalData } = record;
        await createDocument('TEST_RECORDS', originalData);
        await deleteDocument('RECYCLE_BIN', record.id);
      }
      toast.success('Restored selected records', { id: tId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error('Failed to restore some records: ' + err.message, { id: tId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    const tId = toast.loading('Deleting selected permanently...');
    try {
      for (const id of selectedIds) {
        await deleteDocument('RECYCLE_BIN', id);
      }
      toast.success('Permanently deleted selected records', { id: tId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error('Deletion failed: ' + err.message, { id: tId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyBin = async () => {
    if (recycleBinRecords.length === 0) return;
    setIsProcessing(true);
    const tId = toast.loading('Emptying recycle bin...');
    try {
      for (const record of recycleBinRecords) {
        await deleteDocument('RECYCLE_BIN', record.id);
      }
      toast.success('Recycle bin emptied', { id: tId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error('Failed to empty bin: ' + err.message, { id: tId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (record: any) => {
    setIsProcessing(true);
    const tId = toast.loading('Restoring...');
    try {
      const { deletedAt, originalCollection, id, ...originalData } = record;
      // Copy to original collection (TEST_RECORDS)
      await createDocument('TEST_RECORDS', originalData);
      // Delete from recycle bin using its current document ID
      await deleteDocument('RECYCLE_BIN', record.id);
      toast.success('Record restored', { id: tId });
      setSelectedIds(prev => prev.filter(i => i !== record.id));
    } catch (err: any) {
      toast.error('Failed to restore: ' + err.message, { id: tId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (record: any) => {
    setIsProcessing(true);
    const tId = toast.loading('Deleting permanently...');
    try {
      await deleteDocument('RECYCLE_BIN', record.id);
      toast.success('Permanently deleted', { id: tId });
      setSelectedIds(prev => prev.filter(i => i !== record.id));
    } catch (err: any) {
      toast.error('Deletion failed: ' + err.message, { id: tId });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="h-8 w-8 text-[#C09532] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading recycle bin: {error.message || String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Recycle Bin</h1>
        <p className="text-sm text-gray-500 font-medium">Review and restore recently deleted test records</p>
      </div>

      <Card className="overflow-hidden border-none shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
               <Trash2 className="h-5 w-5" />
            </div>
            <div>
               <CardTitle className="text-lg font-black text-gray-900 uppercase tracking-tight">Deleted Records</CardTitle>
               <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{recycleBinRecords.length} items</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
            {selectedIds.length > 0 && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleRestoreSelected()}
                  disabled={isProcessing}
                  className="h-9 text-green-600 border-green-200 bg-green-50 hover:bg-green-100 uppercase text-[10px] tracking-wider font-bold"
                >
                  <RefreshCcw className="h-3 w-3 mr-2" /> Restore Selected ({selectedIds.length})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handlePermanentDeleteSelected()}
                  disabled={isProcessing}
                  className="h-9 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 uppercase text-[10px] tracking-wider font-bold"
                >
                  <Trash2 className="h-3 w-3 mr-2" /> Delete Selected ({selectedIds.length})
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleEmptyBin()}
              disabled={recycleBinRecords.length === 0 || isProcessing}
              className="h-9 text-gray-700 bg-gray-50 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 uppercase text-[10px] tracking-wider font-bold"
            >
              Empty Bin
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-gray-100">
                  <th className="px-6 py-5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-[#C09532] focus:ring-[#C09532] cursor-pointer"
                      checked={recycleBinRecords.length > 0 && selectedIds.length === recycleBinRecords.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-5">Plant Name</th>
                  <th className="px-6 py-5">System Detail</th>
                  <th className="px-6 py-5">Cycle</th>
                  <th className="px-6 py-5">Deleted At</th>
                  <th className="px-6 py-5">Compliance</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recycleBinRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">
                      Recycle Bin is empty
                    </td>
                  </tr>
                ) : (
                  recycleBinRecords.map((record: any) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-[#C09532] focus:ring-[#C09532] cursor-pointer"
                          checked={selectedIds.includes(record.id)}
                          onChange={() => handleSelect(record.id)}
                        />
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">{record.plantName || '-'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 text-sm leading-tight">{record.tagNumber || '-'}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{record.subSystemName || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="info" className="text-[9px] font-black uppercase px-2 py-0.5 h-auto bg-gray-100 text-gray-600 border-none">
                          {record.cycle || '-'}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-bold text-gray-500">
                          {record.deletedAt ? new Date(record.deletedAt).toLocaleString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {record.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleRestore(record)}
                            disabled={isProcessing}
                            className="h-8 bg-green-50 text-green-600 hover:bg-green-100 text-[10px] font-bold px-3"
                          >
                            <RefreshCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handlePermanentDelete(record)}
                            disabled={isProcessing}
                            className="h-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-[10px] font-bold px-3"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
