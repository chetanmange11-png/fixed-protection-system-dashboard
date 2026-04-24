import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, Layers, MoreVertical, ArrowRight, Trash2, Edit, Folder } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { SubSystem, SystemCategory, TestRecord } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';

export default function SubSystems() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = React.useState<SystemCategory | null>(null);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [renamingSub, setRenamingSub] = React.useState<SubSystem | null>(null);
  const [renamedName, setRenamedName] = React.useState('');

  // Admin Auth State
  const [authModal, setAuthModal] = React.useState({
    isOpen: false,
    id: '',
    name: ''
  });

  const loadData = React.useCallback(async () => {
    if (!categoryId) return;
    await dbApi.init();
    const [cats, subs, recs] = await Promise.all([
      dbApi.getCategories(),
      dbApi.getSubSystems(categoryId),
      dbApi.getTestRecords()
    ]);
    const currentCat = cats.find(c => c.id === categoryId);
    if (currentCat) setCategory(currentCat);
    else setCategory(null);
    setSubSystems(subs);
    setRecords(recs.filter(r => r.categoryId === categoryId));
  }, [categoryId]);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleAdd = async () => {
    if (!newName || !categoryId) return;
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      categoryId,
      name: newName
    };
    await dbApi.saveSubSystem(newItem);
    await loadData();
    setNewName('');
    setIsAddModalOpen(false);
  };

  const handleRename = async () => {
    if (!renamedName || !renamingSub) return;
    await dbApi.renameSubSystem(renamingSub.id, renamedName);
    await loadData();
    setIsRenameModalOpen(false);
    setRenamingSub(null);
    setRenamedName('');
  };

  const handleDeleteSub = async () => {
    await dbApi.deleteSubSystem(authModal.id);
    setAuthModal({ ...authModal, isOpen: false });
    await loadData();
  };

  const filtered = subSystems.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <AppInput 
            placeholder="Search sub-folders..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Add Sub-folder
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="h-20 w-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No sub-folders found</h2>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Get started by creating a new sub-folder to organize your plants and units in this category.
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
            const totalRecordsCount = subRecords.length;
            const completedRecordsCount = subRecords.filter(r => r.status === 'Completed').length;
            
            return (
              <Card 
                key={sub.id} 
                className="group cursor-pointer hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-0 overflow-hidden rounded-3xl border-gray-100 shadow-sm"
              >
                <div 
                  className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex flex-col items-center justify-center group-hover:from-blue-50 group-hover:to-blue-100 transition-colors relative"
                  onClick={() => navigate(`/categories/${categoryId}/${sub.id}`)}
                >
                  {/* Decorative background circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/40 rounded-full blur-xl group-hover:bg-blue-200/40 transition-colors" />
                  
                  <div className="p-4 bg-white/90 backdrop-blur border border-white/50 rounded-2xl shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all relative z-10 mb-4">
                    <Layers className="h-8 w-8 text-blue-600 drop-shadow-sm" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 truncate w-full text-center group-hover:text-blue-700 transition-colors relative z-10" title={sub.name}>
                    {sub.name}
                  </h3>
                </div>
                
                <div className="p-5 bg-white relative">
                  <div className="absolute -top-6 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-1 z-20">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-white shadow-sm border border-gray-100 hover:bg-blue-50 text-gray-500 rounded-full"
                      title="Rename Sub-folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingSub(sub);
                        setRenamedName(sub.name);
                        setIsRenameModalOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-white shadow-sm border border-gray-100 hover:bg-red-50 text-gray-500 rounded-full"
                      title="Delete Sub-folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAuthModal({
                          isOpen: true,
                          id: sub.id,
                          name: sub.name
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                  
                  {/* Embedded Stats Section */}
                  <div className="flex items-center gap-3 bg-gray-50/80 border border-gray-100 rounded-xl p-3 mb-4">
                    <div className="flex flex-col flex-1 pl-1">
                      <span className="text-base font-black text-gray-900 leading-none">{totalRecordsCount}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total tests</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex flex-col flex-1">
                      <span className="text-base font-black text-blue-600 leading-none">{completedRecordsCount}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Completed</span>
                    </div>
                  </div>

                  <div 
                    className="flex justify-between items-center text-blue-600 text-sm font-semibold transition-all cursor-pointer p-2 -mx-2 rounded-lg hover:bg-blue-50/50"
                    onClick={() => navigate(`/categories/${categoryId}/${sub.id}`)}
                  >
                    <span>View Dashboard</span>
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AdminAuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onConfirm={handleDeleteSub}
        actionTitle={`Delete Sub-folder: ${authModal.name}`}
      />

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
    </div>
  );
}
