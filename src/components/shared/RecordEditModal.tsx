import * as React from 'react';
import { dbApi } from '../../db/storage';
import { 
  TestRecord, 
  MaintenanceCycle, 
  TestingStatus, 
  HealthCondition, 
  ScheduleMonth,
  Plant,
  SystemCategory,
  SubSystem
} from '../../types';
import { Dialog } from '../ui/Dialog';
import { AppInput } from '../ui/AppInput';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface RecordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TestRecord | null;
  onSave: () => void;
  isNew?: boolean;
}

export function RecordEditModal({ isOpen, onClose, record, onSave, isNew }: RecordEditModalProps) {
  const [formData, setFormData] = React.useState<Partial<TestRecord>>({});
  const [users, setUsers] = React.useState<{id: string, name: string}[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const load = async () => {
        await dbApi.init();
        const [allUsers, allPlants, allCats, allSubs] = await Promise.all([
          dbApi.getUsers(),
          dbApi.getPlants(),
          dbApi.getCategories(),
          dbApi.getSubSystems()
        ]);
        setUsers(allUsers.filter(u => u.role === 'Admin' || u.role === 'Technician'));
        setPlants(allPlants);
        setCategories(allCats);
        setSubSystems(allSubs);
      };
      load();

      if (record) {
        setFormData({ ...record });
      } else if (isNew) {
        setFormData({
          scheduleMonth: 'January',
          cycle: 'Q1',
          status: 'Pending',
          healthCondition: 'Satisfactory',
          tagNumber: '',
          location: '',
          dateOfTesting: '',
          testedBy: '',
          plantPersonnel: '',
          deficiency: '',
          actionTaken: '',
          attachmentUrl: ''
        });
      }
    }
  }, [record, isNew, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, attachmentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        if (!formData.plantId || !formData.categoryId || !formData.subSystemId || !formData.tagNumber) {
          alert('Please fill all required fields');
          return;
        }
        // Enrichment
        const plant = plants.find(p => p.id === formData.plantId);
        const cat = categories.find(c => c.id === formData.categoryId);
        const sub = subSystems.find(s => s.id === formData.subSystemId);

        const newRecord: TestRecord = {
          ...(formData as TestRecord),
          id: Math.random().toString(36).substr(2, 9),
          plantName: plant?.name || '',
          unitType: plant?.unitType || '',
          categoryName: cat?.name || '',
          subSystemName: sub?.name || '',
          updatedAt: new Date().toISOString()
        };
        await dbApi.saveTestRecord(newRecord);
      } else {
        if (!record) return;
        
        const plant = plants.find(p => p.id === formData.plantId);
        const cat = categories.find(c => c.id === formData.categoryId);
        const sub = subSystems.find(s => s.id === formData.subSystemId);

        const updatedRecord: TestRecord = {
          ...(formData as TestRecord),
          plantName: plant?.name || formData.plantName || '',
          unitType: plant?.unitType || formData.unitType || '',
          categoryName: cat?.name || formData.categoryName || '',
          subSystemName: sub?.name || formData.subSystemName || '',
          updatedAt: new Date().toISOString()
        };
        await dbApi.saveTestRecord(updatedRecord);
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Save failed: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isOpen) return null;

  const selectedSubs = subSystems.filter(s => s.categoryId === formData.categoryId);

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isNew ? "Create Master Testing Schedule" : "Edit Test Record"}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hierarchy Selectors for New Record */}
        {isNew ? (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
             <div className="space-y-1.5">
               <label className="text-xs font-black text-gray-400 uppercase tracking-widest">1. Select Facility</label>
               <select 
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.plantId || ''}
                onChange={(e) => setFormData({...formData, plantId: e.target.value})}
               >
                 <option value="">Choose Plant...</option>
                 {plants.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-black text-gray-400 uppercase tracking-widest">2. Select System</label>
               <select 
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                value={formData.categoryId || ''}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value, subSystemId: ''})}
               >
                 <option value="">Choose Category...</option>
                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-black text-gray-400 uppercase tracking-widest">3. Select Sub-System (Folder)</label>
               <select 
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                value={formData.subSystemId || ''}
                onChange={(e) => setFormData({...formData, subSystemId: e.target.value})}
                disabled={!formData.categoryId}
               >
                 <option value="">Choose Folder...</option>
                 {selectedSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-black text-gray-400 uppercase tracking-widest">4. Plant Unit Option</label>
               <select 
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/20"
                value={plants.find(p => p.id === formData.plantId)?.unitType || ''}
                disabled
               >
                 <option value="">System Auto-Detect...</option>
                 <option value="Main Process">Main Process Units</option>
                 <option value="Storage/Tank Farm">Storage & Tank Farms</option>
                 <option value="Offsites/Utility">Offsites & Utilities</option>
                 <option value="Admin/General">Admin & General Area</option>
               </select>
               <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 italic">Linked to Facility Category</p>
             </div>
          </div>
        ) : (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 md:col-span-2 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Context</p>
              <h4 className="font-bold text-gray-900">{record?.plantName} • {record?.categoryName} • {record?.subSystemName}</h4>
            </div>
            <Badge variant="info">Ref: {record?.tagNumber}</Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Schedule Month</label>
             <select 
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={formData.scheduleMonth || 'January'}
              onChange={(e) => setFormData({...formData, scheduleMonth: e.target.value as ScheduleMonth})}
             >
               {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
             </select>
          </div>
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">System Period</label>
             <select 
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={formData.cycle || 'Q1'}
              onChange={(e) => setFormData({...formData, cycle: e.target.value as MaintenanceCycle})}
             >
               {['Q1', 'Q2', 'Q3', 'Q4', 'First Semiannual', 'Second Semiannual', 'Annual', 'Bi-Annual'].map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AppInput 
            label="Tag No." 
            placeholder="e.g. MV-001" 
            value={formData.tagNumber}
            onChange={(e) => setFormData({...formData, tagNumber: e.target.value})}
          />
          <AppInput 
            label="Location" 
            placeholder="e.g. Ground Floor" 
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Testing Status</label>
             <select 
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={formData.status || 'Pending'}
              onChange={(e) => setFormData({...formData, status: e.target.value as TestingStatus})}
             >
               {['Completed', 'Pending', 'Overdue', 'Under Maintenance'].map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <AppInput 
            label="Date of Testing" 
            type="date"
            value={formData.dateOfTesting}
            onChange={(e) => setFormData({...formData, dateOfTesting: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Tested By (Admin/Auth. Tech)</label>
             <select 
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              value={formData.testedBy || ''}
              onChange={(e) => setFormData({...formData, testedBy: e.target.value})}
              required
             >
               <option value="">Select Personnel...</option>
               {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
             </select>
          </div>
          <AppInput 
            label="Plant Personnel / Unit Head" 
            placeholder="Unit Representative Name" 
            value={formData.plantPersonnel}
            onChange={(e) => setFormData({...formData, plantPersonnel: e.target.value})}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Deficiency Details</label>
          <textarea 
            className="w-full min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={formData.deficiency || ''}
            onChange={(e) => setFormData({...formData, deficiency: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Healthy Condition</label>
             <select 
              className={cn(
                "w-full h-10 rounded-lg border px-3 py-2 text-sm focus:ring-2",
                formData.healthCondition === 'Satisfactory' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
              )}
              value={formData.healthCondition || 'Satisfactory'}
              onChange={(e) => setFormData({...formData, healthCondition: e.target.value as HealthCondition})}
             >
               <option value="Satisfactory">Satisfactory ✔️</option>
               <option value="Unsatisfactory">Unsatisfactory ⚠️</option>
             </select>
          </div>
          <AppInput 
            label="Action Taken" 
            value={formData.actionTaken}
            onChange={(e) => setFormData({...formData, actionTaken: e.target.value})}
          />
        </div>

        <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
           <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <AppInput 
                  label="Test Evidence (Photo/File)" 
                  placeholder="No attachment" 
                  className="bg-white text-xs"
                  value={formData.attachmentUrl?.startsWith('data:') ? 'Captured Image ✓' : formData.attachmentUrl}
                  readOnly
                />
              </div>
              <div className="flex space-x-2">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*" 
                   capture="environment" 
                   onChange={handleFileChange} 
                 />
                 <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                 >
                   Capture / Upload
                 </Button>
                 {formData.attachmentUrl && (
                   <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => setFormData({...formData, attachmentUrl: ''})}
                   >
                      Clear
                   </Button>
                 )}
              </div>
           </div>
           {formData.attachmentUrl?.startsWith('data:') && (
              <div className="mt-3 relative w-20 h-20 rounded shadow-sm overflow-hidden border bg-white flex items-center justify-center">
                 <img src={formData.attachmentUrl} className="w-full h-full object-contain" alt="Preview" referrerPolicy="no-referrer" />
              </div>
           )}
        </div>

        <div className="flex justify-end space-x-3 md:col-span-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Discard</Button>
          <Button className="px-8" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Dialog>
  );
}
