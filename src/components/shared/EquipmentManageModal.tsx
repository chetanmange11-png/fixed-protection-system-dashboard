import * as React from 'react';
import { 
  Dialog
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AppInput } from '../ui/AppInput';
import { dbApi } from '../../db/storage';
import { Plant, SubSystem, SystemCategory, Frequency, MaintenanceCycle, PlantEquipment } from '../../types/index';
import { cn } from '../../lib/utils';
import { ShieldCheck, Plus, Trash2, Link as LinkIcon } from 'lucide-react';

interface EquipmentManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EquipmentManageModal({ isOpen, onClose, onSave }: EquipmentManageModalProps) {
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  const [existingMappings, setExistingMappings] = React.useState<any[]>([]);

  const [selectedPlantId, setSelectedPlantId] = React.useState('');
  const [selectedSubSystemId, setSelectedSubSystemId] = React.useState('');
  const [selectedFrequency, setSelectedFrequency] = React.useState<MaintenanceCycle>('Q1');
  const [tagNumber, setTagNumber] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      const load = async () => {
        await dbApi.init();
        const [allPlants, allCats, allSubs] = await Promise.all([
          dbApi.getPlants(),
          dbApi.getCategories(),
          dbApi.getSubSystems()
        ]);
        setPlants(allPlants);
        setCategories(allCats);
        setSubSystems(allSubs);
        
        // We handle current mappings once a plant is selected for cleaner UX
        // but here we can load all for initial state if selectedPlantId exists
        if (selectedPlantId) {
          setExistingMappings(await dbApi.getPlantEquipment(selectedPlantId));
        }
      };
      load();
    }
  }, [isOpen, selectedPlantId]);

  const handleAddMapping = async () => {
    if (!selectedPlantId || !selectedSubSystemId || !tagNumber) return;

    const plant = plants.find(p => p.id === selectedPlantId);
    const sub = subSystems.find(s => s.id === selectedSubSystemId);
    const category = categories.find(c => c.id === sub?.categoryId);

    // Create a mapping entry
    const newMapping = {
      plantId: selectedPlantId,
      plantName: plant?.name,
      subSystemId: selectedSubSystemId,
      subSystemName: sub?.name,
      categoryId: sub?.categoryId,
      categoryName: category?.name,
      tagNumber,
      cycle: selectedFrequency,
      status: 'Pending',
      lastTestDate: '',
      updatedAt: new Date().toISOString()
    };

    // Save as a shell TestRecord for the schedule
    await dbApi.saveTestRecord(newMapping as any);
    
    // Also save in the equipment mapping table for management
    await dbApi.savePlantEquipment({
      plantId: selectedPlantId,
      subSystemId: selectedSubSystemId,
      frequency: selectedFrequency as any,
      tagNumber
    });

    setExistingMappings(await dbApi.getPlantEquipment(selectedPlantId));
    onSave();
    resetForm();
  };

  const resetForm = () => {
    setSelectedSubSystemId('');
    setTagNumber('');
  };

  const filteredMappings = existingMappings.filter(m => !selectedPlantId || m.plantId === selectedPlantId);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Plant-Equipment Mapping Catalog" maxWidth="max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
        {/* Creation Side */}
        <div className="space-y-6">
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Assign New System
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Select Facility</label>
                <select 
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                >
                  <option value="">Choose Plant...</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.code}: {p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Equipment System</label>
                <select 
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  value={selectedSubSystemId}
                  onChange={(e) => setSelectedSubSystemId(e.target.value)}
                >
                  <option value="">Select Catalog Item...</option>
                  {subSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Testing Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Q1', 'Q2', 'Q3', 'Q4', 'First Semiannual', 'Second Semiannual', 'Annual'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFrequency(f as MaintenanceCycle)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                        selectedFrequency === f ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <AppInput 
                label="Identifier / Tag No."
                placeholder="e.g. MV-UNIT1-001"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
              />

              <Button onClick={handleAddMapping} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20">
                Establish Mapping
              </Button>
            </div>
          </div>
        </div>

        {/* List Side */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
               <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
               Current Assignments 
             </h3>
             <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500">{filteredMappings.length} Connected</span>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredMappings.length > 0 ? filteredMappings.map((m) => (
              <div key={m.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{m.tagNumber}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{subSystems.find(s => s.id === m.subSystemId)?.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">{m.frequency}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={async () => {
                    await dbApi.deletePlantEquipment(m.id);
                    setExistingMappings(await dbApi.getPlantEquipment(selectedPlantId));
                  }}
                  className="bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl h-8 w-8 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center text-gray-300 border border-dashed rounded-3xl border-gray-100">
                <ShieldCheck className="h-10 w-10 mb-4 opacity-10" />
                <p className="text-[10px] uppercase font-black tracking-widest">No active mapping identified</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
