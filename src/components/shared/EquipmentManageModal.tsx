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

import { useGlobalStore } from '../../store/useGlobalStore';

interface EquipmentManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialCategoryId?: string | null;
}

export function EquipmentManageModal({ isOpen, onClose, onSave, initialCategoryId }: EquipmentManageModalProps) {
  const { theme } = useGlobalStore();
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  const [existingMappings, setExistingMappings] = React.useState<any[]>([]);

  const [selectedPlantId, setSelectedPlantId] = React.useState('');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');
  const [selectedSubSystemId, setSelectedSubSystemId] = React.useState('');
  const [selectedFrequency, setSelectedFrequency] = React.useState<MaintenanceCycle>('Q1');
  const [tagNumber, setTagNumber] = React.useState('');

  const getFilteredSubSystems = (catId: string) => {
    return subSystems.filter(s => s.categoryId === catId);
  };

  const getFilteredPlants = (subId: string) => {
    if (!subId) return [];
    // Only show plants that were either created in this subfolder OR are unassigned/can be linked
    return plants.filter(p => p.subSystemId === subId || !p.subSystemId);
  };

  React.useEffect(() => {
    if (selectedPlantId && !tagNumber) {
      const plant = plants.find(p => p.id === selectedPlantId);
      if (plant) {
        const prefix = plant.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        setTagNumber(`${prefix}-`);
      }
    }
  }, [selectedPlantId, plants, tagNumber]);

  React.useEffect(() => {
    if (isOpen) {
      if (initialCategoryId) {
        setSelectedCategoryId(initialCategoryId);
      }
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

    const activeYear = await dbApi.getActiveYear();

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
      financialYear: activeYear,
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
          <div className={cn("p-6 rounded-3xl border", theme === 'modern' ? "bg-slate-900/60 border-slate-800" : "bg-[#C09532]/5 border-[#C09532]/10")}>
            <h3 className={cn("text-sm font-black uppercase tracking-widest mb-6 flex items-center", theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")}>
              <Plus className="h-4 w-4 mr-2" />
              Assign New System
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={cn("text-xs font-bold uppercase", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>System Category</label>
                <select 
                  className={cn("w-full h-11 rounded-xl border px-4 text-sm font-medium focus:ring-2 transition-all", theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-200 focus:ring-[#D4AF37]/30" : "bg-white border-gray-200 focus:ring-[#C09532]/20")}
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubSystemId('');
                    setSelectedPlantId('');
                  }}
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={cn("text-xs font-bold uppercase", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>Equipment / Sub-System Folder</label>
                <select 
                  className={cn("w-full h-11 rounded-xl border px-4 text-sm font-medium focus:ring-2 disabled:opacity-50 transition-all", theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-200 focus:ring-[#D4AF37]/30" : "bg-white border-gray-200 focus:ring-blue-500/20")}
                  value={selectedSubSystemId}
                  onChange={(e) => {
                    setSelectedSubSystemId(e.target.value);
                    setSelectedPlantId('');
                  }}
                  disabled={!selectedCategoryId}
                >
                  <option value="">Select Sub-folder...</option>
                  {getFilteredSubSystems(selectedCategoryId).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={cn("text-xs font-bold uppercase", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>Select Facility</label>
                <select 
                  className={cn("w-full h-11 rounded-xl border px-4 text-sm font-medium focus:ring-2 disabled:opacity-50 transition-all", theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-200 focus:ring-[#D4AF37]/30" : "bg-white border-gray-200 focus:ring-blue-500/20")}
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                  disabled={!selectedSubSystemId}
                >
                  <option value="">Choose Plant...</option>
                  {getFilteredPlants(selectedSubSystemId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={cn("text-xs font-bold uppercase", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>Testing Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Q1', 'Q2', 'Q3', 'Q4', 'First Semiannual', 'Second Semiannual', 'Annual'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFrequency(f as MaintenanceCycle)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                        selectedFrequency === f 
                          ? (theme === 'modern' ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]" : "bg-[#C09532] border-[#C09532] text-white") 
                          : (theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-400 hover:border-[#D4AF37]/50" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300")
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

              <Button onClick={handleAddMapping} className="w-full h-12 bg-[#C09532] hover:bg-[#A88028] text-white rounded-2xl font-black shadow-lg shadow-[#C09532]/20">
                Establish Mapping
              </Button>
            </div>
          </div>
        </div>

        {/* List Side */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className={cn("text-xs font-black uppercase tracking-widest flex items-center", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
               <LinkIcon className={cn("h-4 w-4 mr-2", theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")} />
               Current Assignments 
             </h3>
             <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", theme === 'modern' ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500")}>{filteredMappings.length} Connected</span>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredMappings.length > 0 ? filteredMappings.map((m) => (
              <div key={m.id} className={cn("p-4 rounded-2xl border flex items-center justify-between group transition-all", theme === 'modern' ? "bg-slate-900/40 border-slate-800 hover:border-[#D4AF37]/50" : "bg-white border-gray-100 hover:border-[#C09532]/20")}>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")}>{m.tagNumber}</span>
                  </div>
                  <p className={cn("text-sm font-bold mt-0.5", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{subSystems.find(s => s.id === m.subSystemId)?.name}</p>
                  <p className={cn("text-[10px] uppercase font-bold mt-1", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>{m.frequency}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={async () => {
                    await dbApi.deletePlantEquipment(m.id);
                    setExistingMappings(await dbApi.getPlantEquipment(selectedPlantId));
                  }}
                  className={cn("rounded-xl h-8 w-8 opacity-0 group-hover:opacity-100 transition-all", theme === 'modern' ? "text-red-400 hover:bg-slate-800" : "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white")}
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
