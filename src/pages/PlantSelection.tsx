import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Building2, LayoutDashboard, Plus, Trash2, Folder, Layers, Edit, Home } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { Plant, SubSystem, SystemCategory } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';

export default function PlantSelection() {
  const { categoryId, subSystemId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = React.useState<SystemCategory | null>(null);
  const [subSystem, setSubSystem] = React.useState<SubSystem | null>(null);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [newPlantName, setNewPlantName] = React.useState('');
  const [newPlantCode, setNewPlantCode] = React.useState('');
  const [renamingPlant, setRenamingPlant] = React.useState<Plant | null>(null);
  const [renamedName, setRenamedName] = React.useState('');
  const [renamedCode, setRenamedCode] = React.useState('');

  // Admin Auth State
  const [authModal, setAuthModal] = React.useState({
    isOpen: false,
    id: '',
    name: ''
  });

  const loadData = React.useCallback(async () => {
    if (!subSystemId || !categoryId) return;
    await dbApi.init();
    const [cats, subs, allPlants] = await Promise.all([
      dbApi.getCategories(),
      dbApi.getSubSystems(),
      dbApi.getPlants(subSystemId)
    ]);
    setCategory(cats.find(c => c.id === categoryId) || null);
    
    const current = subs.find(s => s.id === subSystemId);
    if (current) setSubSystem(current);
    setPlants(allPlants);
  }, [subSystemId, categoryId]);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleAddPlant = async () => {
    if (!newPlantName || !newPlantCode || !subSystemId) return;
    const newPlant: Plant = {
      id: Math.random().toString(36).substr(2, 9),
      subSystemId: subSystemId, 
      code: newPlantCode,
      name: newPlantName
    };
    await dbApi.savePlant(newPlant);
    await loadData();
    setNewPlantName('');
    setNewPlantCode('');
    setIsAddModalOpen(false);
  };

  const handleRenamePlant = async () => {
    if (!renamedName || !renamedCode || !renamingPlant) return;
    const updatedPlant = { ...renamingPlant, name: renamedName, code: renamedCode };
    await dbApi.savePlant(updatedPlant);
    await loadData();
    setIsRenameModalOpen(false);
    setRenamingPlant(null);
  };

  const handleDeletePlant = async () => {
    await dbApi.deletePlant(authModal.id);
    await loadData();
  };

  const filtered = plants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'System Categories', path: '/categories', icon: Folder },
          { label: category?.name || 'Category', path: `/categories/${categoryId}`, icon: Layers },
          { label: subSystem?.name || 'Sub-System', active: true, icon: Layers }
        ]}
      />

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/categories/${categoryId}`)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{subSystem?.name}</h1>
          <p className="text-sm text-gray-500">Select plant unit for detailed testing dashboard</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <AppInput 
            placeholder="Search plant units..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Add Plant Unit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((plant) => (
          <Card 
            key={plant.id} 
            className="group cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-300 p-0 overflow-hidden relative"
          >
            <div 
              className="bg-gray-50 p-8 flex flex-col items-center justify-center group-hover:bg-blue-50 transition-colors"
              onClick={() => navigate(`/categories/${categoryId}/${subSystemId}/${plant.id}`)}
            >
              <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform mb-3">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">{plant.code}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-gray-900 truncate flex-1" onClick={() => navigate(`/categories/${categoryId}/${subSystemId}/${plant.id}`)}>{plant.name}</span>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-gray-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingPlant(plant);
                    setRenamedName(plant.name);
                    setRenamedCode(plant.code);
                    setIsRenameModalOpen(true);
                  }}
                  title="Edit Plant"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAuthModal({
                      isOpen: true,
                      id: plant.id,
                      name: plant.name
                    });
                  }}
                  title="Move to Bin"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <div className="flex items-center justify-center h-7 w-7 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" onClick={() => navigate(`/categories/${categoryId}/${subSystemId}/${plant.id}`)}>
                  <LayoutDashboard className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AdminAuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onConfirm={handleDeletePlant}
        actionTitle={`Delete Plant Unit: ${authModal.name}`}
      />

      <Dialog
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title={`Rename Plant Unit: ${renamingPlant?.name}`}
      >
        <div className="space-y-4">
          <AppInput 
            label="Plant Code" 
            placeholder="e.g. UNIT-21"
            value={renamedCode}
            onChange={(e) => setRenamedCode(e.target.value)}
          />
          <AppInput 
            label="Plant Name" 
            placeholder="e.g. Generation Unit 1"
            value={renamedName}
            onChange={(e) => setRenamedName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRenamePlant}>Save Changes</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Plant Unit"
      >
        <div className="space-y-4">
          <AppInput 
            label="Plant Code" 
            placeholder="e.g. UNIT-21"
            value={newPlantCode}
            onChange={(e) => setNewPlantCode(e.target.value)}
          />
          <AppInput 
            label="Plant Name" 
            placeholder="e.g. Generation Unit 1"
            value={newPlantName}
            onChange={(e) => setNewPlantName(e.target.value)}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPlant}>Add Plant</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
