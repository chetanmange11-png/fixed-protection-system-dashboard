import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, Layers, MoreVertical, ArrowRight, Trash2, Edit, Folder } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { SubSystem, SystemCategory, TestRecord } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { AdminDeleteGateModal } from '../components/shared/AdminDeleteGateModal';
import { useGlobalStore } from '../store/useGlobalStore';
import { cn } from '../lib/utils';

export default function SubSystems() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { theme, categories, subSystems: allSubSystems, records: allRecords, activeCycle } = useGlobalStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [renamingSub, setRenamingSub] = React.useState<SubSystem | null>(null);
  const [renamedName, setRenamedName] = React.useState('');
  const [deleteGate, setDeleteGate] = React.useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const [isProcessing, setIsProcessing] = React.useState(false);

  const category = categories.find(c => c.id === categoryId) || null;
  const subSystems = allSubSystems.filter(s => s.categoryId === categoryId);
  const records = allRecords.filter(r => r.categoryId === categoryId && r.financialYear === activeCycle);

  const handleAdd = async () => {
    if (!newName || !categoryId) return;
    setIsProcessing(true);
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      categoryId,
      name: newName
    };
    await dbApi.saveSubSystem(newItem);
    setNewName('');
    setIsAddModalOpen(false);
    setIsProcessing(false);
  };

  const handleRename = async () => {
    if (!renamedName || !renamingSub) return;
    setIsProcessing(true);
    await dbApi.renameSubSystem(renamingSub.id, renamedName);
    setIsRenameModalOpen(false);
    setRenamingSub(null);
    setRenamedName('');
    setIsProcessing(false);
  };

  const handleDeleteSubFolder = async (subFolderId: string) => {
    setIsProcessing(true);
    useGlobalStore.setState(state => ({
      subSystems: state.subSystems.filter(s => s.id !== subFolderId),
      records: state.records.filter(r => r.subSystemId !== subFolderId)
    }));
    try {
      await dbApi.deleteSubSystem(subFolderId);
    } catch (error) {
      console.error("Failed to delete sub-folder from Firebase:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = subSystems.filter(s => 
    (s.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="space-y-6">
       <Breadcrumbs 
        items={[
          { label: 'System Categories', path: '/categories', icon: Folder },
          { label: category?.name || 'Category', active: true, icon: Layers }
        ]}
      />

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category?.name}</h1>
          <p className="text-sm text-gray-500">Manage sub-system testing folders</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <AppInput 
            placeholder="Search sub-folders..." 
            className="pl-10 h-11 md:h-12" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="h-11 md:h-12 shadow-md">
          <Plus className="h-5 w-5 mr-2" />
          Add Sub-folder
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className={cn("rounded-3xl border p-12 text-center shadow-sm", theme === 'modern' ? "bg-slate-900/60 border-slate-800" : "bg-white border-gray-100")}>
          <div className={cn("h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4", theme === 'modern' ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-blue-50 text-blue-500")}>
            <Layers className="h-10 w-10" />
          </div>
          <h2 className={cn("text-xl font-bold mb-2", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>No sub-folders found</h2>
          <p className={cn("max-w-sm mx-auto mb-6", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
            Get started by creating a new sub-folder to organize your folder units in this category.
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} className="rounded-full px-8 shadow-md" variant="primary">
            <Plus className="h-5 w-5 mr-2" />
            Create First Sub-folder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sub) => {
            const subRecords = records.filter(r => r.subSystemId === sub.id);
            const completedRecordsCount = subRecords.filter(r => r.status === 'Completed').length;
            
            return (
              <Card 
                key={sub.id} 
                className={cn(
                  "group cursor-pointer p-0 overflow-hidden rounded-3xl transition-all duration-300 shadow-sm",
                  theme === 'modern' ? "bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 hover:border-[#D4AF37]/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:-translate-y-1" : "hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 border-gray-100"
                )}
              >
                <div 
                  className={cn(
                    "p-6 flex flex-col items-center justify-center transition-colors relative",
                    theme === 'modern' ? "bg-slate-900/40 backdrop-blur-xl border-b border-slate-800/50 group-hover:bg-slate-900/60" : "bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-blue-50 group-hover:to-blue-100"
                  )}
                  onClick={() => navigate(`/categories/${categoryId}/${sub.id}`)}
                >
                  {/* Decorative background circle */}
                  <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-xl transition-colors",
                    theme === 'modern' ? "bg-[#D4AF37]/5 group-hover:bg-[#D4AF37]/10" : "bg-white/40 group-hover:bg-blue-200/40"
                  )} />
                  
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-all relative z-10 mb-4",
                    theme === 'modern' ? "bg-slate-800/90 border border-slate-700/50 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]" : "bg-white/90 backdrop-blur border border-white/50 group-hover:shadow-md"
                  )}>
                    <Layers className={cn("h-8 w-8 drop-shadow-sm", theme === 'modern' ? "text-[#D4AF37]" : "text-blue-600")} />
                  </div>
                  
                  <h3 className={cn("text-lg font-bold truncate w-full text-center transition-colors relative z-10", theme === 'modern' ? "text-slate-100 group-hover:text-[#D4AF37]" : "text-gray-900 group-hover:text-blue-700")} title={sub.name}>
                    {sub.name}
                  </h3>
                </div>
                
                <div className={cn("p-5 relative", theme === 'modern' ? "bg-slate-900/60 backdrop-blur-xl" : "bg-white")}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-8 w-8 rounded-lg border", theme === 'modern' ? "bg-transparent border-transparent text-slate-400 hover:text-[#D4AF37] hover:bg-slate-800/50" : "bg-gray-50 hover:bg-blue-50 text-blue-600 border-gray-100")}
                        title="Rename Folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingSub(sub);
                          setRenamedName(sub.name);
                          setIsRenameModalOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-8 w-8 rounded-lg border", theme === 'modern' ? "bg-transparent border-transparent text-slate-400 hover:text-[#D4AF37] hover:bg-slate-800/50" : "bg-gray-50 hover:bg-red-50 text-red-500 border-gray-100")}
                        title="Delete Folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteGate({ isOpen: true, id: sub.id, name: sub.name });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Embedded Stats Section */}
                  <div className={cn("flex items-center gap-3 rounded-xl p-3 mb-4", theme === 'modern' ? "bg-slate-950/60 border border-slate-800" : "bg-gray-50/80 border border-gray-100")}>
                    <div className="flex flex-col flex-1 pl-1">
                      <span className={cn("text-base font-black leading-none", theme === 'modern' ? "text-[#D4AF37]" : "text-gray-900")}>{sub.totalPlants || 0}</span>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider mt-1", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>Total Plants</span>
                    </div>
                    <div className={cn("w-px h-6", theme === 'modern' ? "bg-slate-800" : "bg-gray-200")}></div>
                    <div className="flex flex-col flex-1">
                      <span className={cn("text-base font-black leading-none", theme === 'modern' ? "text-[#D4AF37]" : "text-blue-600")}>{completedRecordsCount}</span>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider mt-1", theme === 'modern' ? "text-slate-400" : "text-gray-400")}>Completed Tests</span>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "flex justify-between items-center text-sm font-semibold transition-all cursor-pointer p-2 -mx-2 rounded-lg",
                      theme === 'modern' ? "text-[#D4AF37] hover:bg-slate-800/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" : "text-blue-600 hover:bg-blue-50/50"
                    )}
                    onClick={() => navigate(`/categories/${categoryId}/${sub.id}`)}
                  >
                    <span>View Dashboard</span>
                    <div className={cn(
                      "p-1.5 rounded-full transition-all",
                      theme === 'modern' ? "bg-transparent text-[#D4AF37] group-hover:translate-x-1 group-hover:shadow-[0_0_10px_rgba(212,175,55,0.4)]" : "bg-blue-100 text-blue-600 group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white"
                    )}>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Sub-folder"
      >
        <div className="space-y-4">
          <AppInput 
            label="Sub-folder Name" 
            placeholder="e.g. ROV-1, Pump House"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create Folder</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title={`Rename Sub-folder: ${renamingSub?.name}`}
      >
        <div className="space-y-4">
          <AppInput 
            label="Folder Name" 
            placeholder="Enter new name..."
            value={renamedName}
            onChange={(e) => setRenamedName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Save New Name</Button>
          </div>
        </div>
      </Dialog>

      {deleteGate && (
        <AdminDeleteGateModal
          isOpen={deleteGate.isOpen}
          onClose={() => setDeleteGate(null)}
          onConfirm={() => handleDeleteSubFolder(deleteGate.id)}
          targetName={deleteGate.name}
          targetType="folder"
        />
      )}
    </div>
  );
}
