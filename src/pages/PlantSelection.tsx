import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Building2, Folder, Layers, Plus, Link, ArrowRight, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { useGlobalStore } from '../store/useGlobalStore';
import { dbApi } from '../db/storage';
import { Plant, MasterPlant } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { doc, deleteDoc, getDoc, updateDoc, increment, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function PlantSelection() {
  const { categoryId, subSystemId } = useParams();
  const navigate = useNavigate();
  const categories = useGlobalStore(state => state.categories);
  const subSystems = useGlobalStore(state => state.subSystems);
  const allPlants = useGlobalStore(state => state.plants);
  const masterPlants = useGlobalStore(state => state.masterPlants);
  const currentUser = useGlobalStore(state => state.currentUser);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');

  const category = categories.find(c => c.id === categoryId) || null;
  const subSystem = subSystems.find(s => s.id === subSystemId) || null;
  
  // Get plants that belong to this subSystem
  const subSystemPlants = allPlants.filter(p => p.subSystemId === subSystemId);

  // Map to Solid Plants representation
  const plants = subSystemPlants.map(p => {
    const master = masterPlants.find(m => m.id === p.masterPlantId);
    return {
      plantDocId: p.id,
      masterPlantId: p.masterPlantId,
      plantName: master ? master.plantName : p.name,
      status: master ? master.status : undefined,
      isLegacy: !p.masterPlantId
    };
  });

  const filtered = plants.filter(p => 
    (p.plantName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleSelectMasterPlant = async (master: MasterPlant) => {
    if (!subSystemId) return;
    setIsProcessing(true);
    
    // Check if this subSystem already has this master plant
    const existing = subSystemPlants.find(p => p.masterPlantId === master.id);
    if (!existing) {
       const newPlant: Plant = {
         id: Math.random().toString(36).substr(2, 9),
         subSystemId: subSystemId, 
         code: '',
         name: master.plantName,
         masterPlantId: master.id
       };
       await dbApi.savePlant(newPlant);
    }
    
    setIsModalOpen(false);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'System Categories', path: '/categories', icon: Folder },
          { label: category?.name || 'Category', path: `/categories/${categoryId}`, icon: Layers },
          { label: subSystem?.name || 'Sub-System', active: true, icon: Layers }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/categories/${categoryId}`)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subSystem?.name}</h1>
            <p className="text-sm text-gray-500">Select solid plant for detailed testing dashboard</p>
          </div>
        </div>
        
        <Button onClick={() => setIsModalOpen(true)} className="shadow-lg h-11 md:h-12 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add/Select Solid Plant
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <AppInput 
            placeholder="Search solid plants..." 
            className="pl-10 h-11 md:h-12" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
            <Building2 className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No Solid Plants found in this Sub-System.</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Click below to link existing Solid Plants or create new ones.</p>
            <Button onClick={() => setIsModalOpen(true)} className="shadow-lg h-11">
              <Plus className="h-4 w-4 mr-2" />
              Add/Select Solid Plant
            </Button>
          </div>
        ) : (
          filtered.map((plant) => (
          <Card 
            key={plant.plantDocId} 
             className={`group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-300 p-0 overflow-hidden relative ${plant.status === 'Defective' ? 'border-t-4 border-t-rose-500' : ''}`}
            onClick={() => navigate(`/categories/${categoryId}/${subSystemId}/${plant.plantDocId}`)}
          >
            <div className="absolute top-2 right-2 z-50 pointer-events-auto">
              <button 
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 text-red-500 hover:text-white hover:bg-red-600 shadow-sm transition-all border border-red-100 cursor-pointer"
                onClickCapture={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget(plant);
                }}
                title="Remove from sub-system"
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 pointer-events-none" />
              </button>
            </div>
            <div 
              className={`p-8 flex flex-col items-center justify-center transition-colors ${plant.status === 'Defective' ? 'bg-rose-50' : 'bg-gray-50 group-hover:bg-blue-50'}`}
             >
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <Building2 className={`h-8 w-8 ${plant.status === 'Defective' ? 'text-rose-600' : 'text-blue-600'}`} />
                </div>
            </div>
            
            <div className="p-4 flex flex-col bg-white">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-900 truncate flex-1">{plant.plantName}</span>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                   {/* Tag and Loc removed as per single-container requirement */}
                </div>
                {plant.isLegacy && (
                   <span className="text-[9px] text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded inline-block mt-2 text-center uppercase tracking-widest border border-amber-100">
                     Legacy Unit - Map to Utility Hub
                   </span>
                )}
            </div>
          </Card>
          ))
        )}
      </div>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add/Select Solid Plant" maxWidth="max-w-3xl">
         <div className="space-y-4 pt-4 h-[60vh] flex flex-col">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
              <div>
                <h4 className="font-bold text-blue-900">Master Asset Directory</h4>
                <p className="text-xs text-blue-700">Select a solid plant from the Utility Hub to link to this sub-system.</p>
              </div>
              <Button size="sm" onClick={() => navigate('/others/master-assets')} className="bg-blue-600 hover:bg-blue-700">
                 Add New Solid Plant to Master <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
               {masterPlants.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl">
                     <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                     <p className="mb-4">No Solid Plants found in the Master Directory.</p>
                     <Button variant="outline" onClick={() => navigate('/others/master-assets')}>
                        Go to Utility Hub to Create One
                     </Button>
                  </div>
               ) : (
                 masterPlants.map(mp => {
                   const alreadyAdded = subSystemPlants.some(p => p.masterPlantId === mp.id);
                   return (
                     <div key={mp.id} className={`flex items-center justify-between p-4 border rounded-xl shadow-sm transition-all ${alreadyAdded ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
                        <div>
                           <div className="flex items-center space-x-2">
                             <h4 className={`font-bold ${alreadyAdded ? 'text-gray-500' : 'text-gray-900'}`}>{mp.plantName}</h4>
                             {alreadyAdded && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Added</span>}
                           </div>
                           <div className="flex space-x-3 text-xs mt-1">
                             <span className="text-gray-500">Solid Plant Unit</span>
                           </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={alreadyAdded ? "outline" : "primary"}
                          disabled={alreadyAdded || isProcessing}
                          onClick={() => handleSelectMasterPlant(mp)}
                        >
                          {alreadyAdded ? 'Already Linked' : <><Link className="h-3.5 w-3.5 mr-2" /> Link Solid Plant</>}
                        </Button>
                     </div>
                   );
                 })
               )}
            </div>
         </div>
      </Dialog>
      
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Enter Password to Delete</h3>
            <p className="text-sm text-gray-500 mb-4">You are about to delete <span className="font-semibold">{deleteTarget.plantName}</span>.</p>
            <div className="space-y-4">
              <AppInput
                type="password"
                placeholder="Enter admin password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                className="w-full"
                autoFocus
              />
              {passwordError && <p className="text-sm text-red-500 font-medium">{passwordError}</p>}
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeleteTarget(null);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      if (!currentUser) {
                        setPasswordError('No active user session');
                        return;
                      }

                      if (currentUser.role !== 'Admin') {
                        setPasswordError('Insufficient privileges. Admin role required.');
                        return;
                      }

                      let isPasswordValid = false;
                      
                      let step = 'fetching user doc';
                      try {
                        if (currentUser.id === 'admin-id') {
                          const settings = await dbApi.getSettings();
                          if (passwordInput === (settings.adminPassword || 'admin')) {
                            isPasswordValid = true;
                          }
                        } else {
                          const userSnap = await getDoc(doc(db, 'users', currentUser.id));
                          if (userSnap.exists() && userSnap.data().password === passwordInput) {
                            isPasswordValid = true;
                          }
                        }
                      } catch (e: any) {
                        console.error('Failed at fetching user. ', e);
                        setPasswordError("fetching user error: " + (e.message || "Unknown error"));
                        setIsProcessing(false);
                        return;
                      }
                      
                      if (!isPasswordValid) {
                        setPasswordError('Invalid admin password');
                        return;
                      }

                      try {
                        step = 'removing plant from dbApi';
                        await dbApi.removePlantFromSubSystem(deleteTarget.plantDocId, currentUser.id);
                        
                        if (subSystemId) {
                          step = 'updating subsystem metadata';
                          const activeYear = await dbApi.getActiveYear();
                          await dbApi.updateFolderMetadata(undefined, subSystemId, activeYear);
                        }
                      } catch (e: any) {
                        setPasswordError("Deletion Error: " + (e.message || "Unknown error"));
                        setIsProcessing(false);
                        return;
                      }

                      useGlobalStore.setState(state => {
                        const newPlants = state.plants.filter(p => p.id !== deleteTarget.plantDocId);
                        const subRecords = state.records.filter(r => r.plantId !== deleteTarget.plantDocId);
                        return {
                           plants: newPlants,
                           records: subRecords,
                           subSystems: state.subSystems.map(sub => 
                             sub.id === subSystemId 
                               ? { ...sub, totalPlants: newPlants.filter(p => p.subSystemId === subSystemId).length } 
                               : sub
                           )
                        };
                      });
                      
                      setDeleteTarget(null);
                      setPasswordInput('');
                      setPasswordError('');
                    } catch (error) {
                      console.error("Deletion Error: ", error);
                      setPasswordError(error.message || 'An error occurred during deletion.');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                >
                  {isProcessing ? 'Processing... ' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
