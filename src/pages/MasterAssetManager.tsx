import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Save, Trash2, ArrowLeft, Activity, Edit2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { useGlobalStore } from '../store/useGlobalStore';
import { MasterPlant } from '../types';
import { cn } from '../lib/utils';
import { Dialog } from '../components/ui/Dialog';
import toast from 'react-hot-toast';

export default function MasterAssetManager() {
  const navigate = useNavigate();
  const { theme, masterPlants, currentUser } = useGlobalStore();
  const [formData, setFormData] = React.useState<Partial<MasterPlant>>({
    status: 'Active'
  });
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  // SECURE DELETE STATE
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deletingPlant, setDeletingPlant] = React.useState<MasterPlant | null>(null);
  const [deletePassword, setDeletePassword] = React.useState('');

  const handleSave = async () => {
    if (!formData.plantName) {
      alert("Name is required");
      return;
    }
    setIsProcessing(true);
    await dbApi.saveMasterPlant(formData as MasterPlant);
    setIsProcessing(false);
    setIsModalOpen(false);
    setFormData({ status: 'Active' });
  };

  const initiateDelete = (plant: MasterPlant) => {
    setDeletingPlant(plant);
    setDeletePassword('');
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentUser || currentUser.role !== 'Admin') {
      toast.error('Unauthorized: Only Administrators can delete Master Assets.');
      return;
    }

    let adminPass = '';
    if (currentUser.id === 'admin-id') {
      adminPass = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin';
    } else {
      adminPass = currentUser.password;
    }

    if (!adminPass || deletePassword !== adminPass) {
      toast.error('Incorrect Admin Password');
      return;
    }
    
    if (deletingPlant) {
      setIsProcessing(true);
      await dbApi.deleteMasterPlant(deletingPlant.id, deletingPlant.plantName);
      
      // Update UI state instantly
      useGlobalStore.setState(state => ({
        masterPlants: state.masterPlants.filter(p => p.id !== deletingPlant.id)
      }));
      
      toast.success(`${deletingPlant.plantName} has been permanently deleted.`);
      setIsDeleteModalOpen(false);
      setDeletingPlant(null);
      setDeletePassword('');
      setIsProcessing(false);
    }
  };

  const openEdit = (plant: MasterPlant) => {
    setFormData(plant);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/others')} className={cn("p-2 rounded-full", theme === 'modern' ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className={cn("text-2xl font-black tracking-tight", theme === 'modern' ? "text-white" : "text-gray-900")}>Master Asset Manager</h1>
        <div className="flex-1" />
        <Button onClick={() => { setFormData({ status: 'Active' }); setIsModalOpen(true); }}>Add Solid Plant</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masterPlants.map(plant => (
          <Card key={plant.id} className={cn("border-t-4", plant.status === 'Defective' ? "border-t-rose-500" : "border-t-blue-500", theme === 'modern' ? "bg-slate-900/50" : "bg-white")}>
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Building2 className={cn("h-5 w-5", plant.status === 'Defective' ? "text-rose-500" : "text-blue-500")} />
                  <h3 className={cn("text-lg font-black", theme === 'modern' ? "text-slate-200" : "text-gray-900")}>{plant.plantName}</h3>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(plant)} className="h-8 w-8 text-blue-500 hover:bg-blue-50">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => initiateDelete(plant)} className="h-8 w-8 text-rose-500 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-[10px] uppercase font-bold text-gray-500">
                 <div>
                   <span className="block text-[9px] text-gray-400">Status</span>
                   <span className={cn(plant.status === 'Defective' ? "text-rose-500" : "text-emerald-500")}>{plant.status}</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'Edit Solid Plant' : 'Add Solid Plant'}>
        <div className="space-y-4 pt-4">
            <AppInput 
               label="Plant Name" 
               value={formData.plantName || ''} 
               onChange={e => setFormData({...formData, plantName: e.target.value})} 
            />
            
            <Button onClick={handleSave} disabled={isProcessing} className="w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest mt-4">
              {isProcessing ? 'Saving...' : 'Save Solid Plant'}
            </Button>
          </div>
      </Dialog>
      
      {/* SECURE DELETE MODAL */}
      <Dialog isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Secure Deletion" maxWidth="max-w-md">
        <div className="pt-4 space-y-4">
           <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                 <h4 className="font-bold text-rose-800 uppercase tracking-widest text-xs">WARNING</h4>
                 <p className="text-sm text-rose-700 mt-1">
                   You are about to permanently delete the Master Plant <strong>{deletingPlant?.plantName}</strong>. This action cannot be undone.
                 </p>
              </div>
           </div>
           
           {(!currentUser || currentUser.role !== 'Admin') ? (
             <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <p className="text-red-600 font-bold text-sm text-center">Unauthorized: Only Administrators can delete Master Assets.</p>
             </div>
           ) : (
             <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-gray-500">Admin Password Required</label>
                <input 
                  type="password"
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                  placeholder="Enter Admin Password..."
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                />
             </div>
           )}
           
           <div className="flex space-x-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 h-12 rounded-xl text-gray-600 hover:bg-gray-100">
                Cancel
              </Button>
              <Button 
                variant="danger"
                onClick={confirmDelete} 
                disabled={isProcessing || !currentUser || currentUser.role !== 'Admin' || !deletePassword || deletePassword !== (currentUser.id === 'admin-id' ? ((import.meta as any).env.VITE_ADMIN_PASSWORD || 'admin') : currentUser.password)} 
                className="flex-[2] h-12 rounded-xl text-sm font-bold uppercase tracking-widest bg-rose-600 hover:bg-rose-700"
              >
                {isProcessing ? 'Deleting...' : 'PERMANENTLY DELETE'}
              </Button>
           </div>
        </div>
      </Dialog>
    </div>
  );
}
