import * as React from 'react';
import * as XLSX from 'xlsx';
import { 
  Building2, Plus, Search, Edit3, Trash2, 
  Upload, Download, FileSpreadsheet, Folder,
  Settings as SettingsIcon,
  Filter, MoreVertical, LayoutGrid, List,
  Calendar, RefreshCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { Plant, TestRecord, SubSystem } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { RecordEditModal } from '../components/shared/RecordEditModal';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';
import { exportAllYearlyData } from '../lib/exportUtils';

export default function PlantManagement() {
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [subSystems, setSubSystems] = React.useState<SubSystem[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'master' | 'manage'>('master');
  const [activeYear, setActiveYear] = React.useState<any>(null);
  
  // New Table Filters for Master View
  const [tableFilters, setTableFilters] = React.useState({
    plant: '',
    subsystem: '',
    period: '',
    month: '',
    date: '',
    status: ''
  });
  
  // Modals
  const [isAddPlantOpen, setIsAddPlantOpen] = React.useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<TestRecord | null>(null);
  const [newPlant, setNewPlant] = React.useState({ name: '', code: '', subSystemId: '' });
  const [importText, setImportText] = React.useState('');
  const [nextYearTemp, setNextYearTemp] = React.useState('');
  const excelInputRef = React.useRef<HTMLInputElement>(null);

  // Auth Modal State
  const [authModal, setAuthModal] = React.useState<{
    isOpen: boolean;
    type: 'record' | 'all-units' | 'plant' | 'cycle' | null;
    targetId?: string;
    title: string;
  }>({
    isOpen: false,
    type: null,
    title: ''
  });

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [year, p, s, c, r] = await Promise.all([
      dbApi.getActiveYear(),
      dbApi.getPlants(),
      dbApi.getSubSystems(),
      dbApi.getCategories(),
      dbApi.getTestRecords()
    ]);
    setActiveYear(year);
    setPlants(p);
    setSubSystems(s);
    setCategories(c);
    setRecords(r);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleAddPlant = async () => {
    if (!newPlant.name || !newPlant.code || !newPlant.subSystemId) {
      alert('Please fill Name, Code and Folder (Sub-System)');
      return;
    }
    const plant: Plant = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlant.name,
      code: newPlant.code,
      subSystemId: newPlant.subSystemId,
      unitType: (newPlant as any).unitType
    };
    await dbApi.savePlant(plant);
    await loadData();
    setNewPlant({ name: '', code: '', subSystemId: '' });
    setIsAddPlantOpen(false);
  };

  const handleImportCSV = async () => {
    // Basic CSV parser for text area
    const lines = importText.split('\n');
    const header = lines[0].split(',');
    const codeIdx = header.findIndex(h => h.trim().toUpperCase() === 'PLANT CODE');
    const nameIdx = header.findIndex(h => h.trim().toUpperCase() === 'PLANT NAME');

    if (codeIdx === -1 || nameIdx === -1) {
      alert('CSV must have "PLANT CODE" and "PLANT NAME" headers.');
      return;
    }

    const promises: Promise<void>[] = [];
    lines.slice(1).forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        promises.push(dbApi.savePlant({
          id: Math.random().toString(36).substr(2, 9),
          code: parts[codeIdx].trim(),
          name: parts[nameIdx].trim()
        }));
      }
    });
    
    await Promise.all(promises);

    setPlants(await dbApi.getPlants());
    setIsImportOpen(false);
    setImportText('');
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      data.forEach(row => {
        // Try to find columns regardless of exact case
        const code = row['Plant Code'] || row['PLANT CODE'] || row['Unit Code'] || row['code'];
        const name = row['Plant Name'] || row['PLANT NAME'] || row['name'];

        if (code && name) {
          dbApi.savePlant({
            id: Math.random().toString(36).substr(2, 9),
            code: String(code).trim(),
            name: String(name).trim()
          });
        }
      });

      loadData();
      setIsImportOpen(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmAuth = async () => {
    if (authModal.type === 'record' && authModal.targetId) {
      await dbApi.deleteTestRecord(authModal.targetId);
      await loadData();
    } else if (authModal.type === 'all-units') {
      await Promise.all(plants.map(p => dbApi.deletePlant(p.id)));
      await loadData();
    } else if (authModal.type === 'plant' && authModal.targetId) {
      await dbApi.deletePlant(authModal.targetId);
      await loadData();
    } else if (authModal.type === 'cycle' && nextYearTemp) {
      await dbApi.startNewCycle(nextYearTemp as any);
      window.dispatchEvent(new Event('fy-change'));
      setNextYearTemp('');
    }
    setAuthModal({ ...authModal, isOpen: false });
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.plantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.subSystemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.tagNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlant = !tableFilters.plant || r.plantName?.toLowerCase().includes(tableFilters.plant.toLowerCase());
    const matchesSub = !tableFilters.subsystem || r.subSystemName?.toLowerCase().includes(tableFilters.subsystem.toLowerCase());
    const matchesPeriod = !tableFilters.period || r.cycle?.toLowerCase().includes(tableFilters.period.toLowerCase());
    const matchesMonth = !tableFilters.month || (r.scheduleMonth || '').toLowerCase().includes(tableFilters.month.toLowerCase());
    const matchesDate = !tableFilters.date || (r.dateOfTesting || '').toLowerCase().includes(tableFilters.date.toLowerCase());
    const matchesStatus = !tableFilters.status || r.status?.toLowerCase().includes(tableFilters.status.toLowerCase());

    return matchesSearch && matchesPlant && matchesSub && matchesPeriod && matchesMonth && matchesDate && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Cycle Management & Global Export Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
               <Calendar className="h-6 w-6" />
            </div>
            <div>
               <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Cycle & Archival Lifecycle</h3>
               <p className="text-xs text-gray-500 font-medium">Manage yearly data transition and master exports.</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="px-5 py-2.5 bg-gray-50 rounded-2xl border border-dotted border-gray-200 flex items-center">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-3">Current Active:</span>
               <Badge variant="info" className="font-mono text-[11px] tracking-tight">FY {activeYear}</Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={() => exportAllYearlyData(activeYear)}
              className="rounded-2xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
            >
               <FileSpreadsheet className="h-4 w-4 mr-2" />
               Master Archival Export
            </Button>
            <Button 
              className="rounded-2xl bg-gray-900 hover:bg-black text-white shadow-lg shadow-gray-200"
              onClick={() => {
                const nextYear = prompt('Enter next Financial Year (e.g. 2027-28):');
                if (nextYear && nextYear.length === 7) {
                  setNextYearTemp(nextYear);
                  setAuthModal({
                    isOpen: true,
                    type: 'cycle',
                    title: `START NEW CYCLE FOR ${nextYear}?\n\nThis will clone your folder structure and plants, marking all test records as Pending for the new year.`
                  });
                } else if (nextYear) {
                  alert('Invalid format. Use YYYY-YY (e.g. 2027-28)');
                }
              }}
            >
               <RefreshCcw className="h-4 w-4 mr-2" />
               Initiate New Cycle
            </Button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm self-start">
          <Button 
            variant={viewMode === 'master' ? 'primary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('master')}
            className="rounded-lg"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Testing Schedule Master
          </Button>
          <Button 
            variant={viewMode === 'manage' ? 'primary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('manage')}
            className="rounded-lg"
          >
             <SettingsIcon className="h-4 w-4 mr-2" />
            Plant Inventory & Delete
          </Button>
        </div>
        
        {viewMode === 'manage' && (
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:bg-red-50"
              onClick={() => {
                setAuthModal({
                  isOpen: true,
                  type: 'all-units',
                  title: 'Delete ALL Plant Units'
                });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Units
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setIsAddPlantOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plant
            </Button>
          </div>
        )}
      </div>

      <Card className="flex-1 overflow-hidden p-0 flex flex-col">
        {viewMode === 'master' ? (
          <>
            <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Global Testing Schedule</CardTitle>
                <p className="text-sm text-gray-500">Master list of all maintenance cycles across systems</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button size="sm" onClick={() => setIsAddScheduleOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Schedule
                </Button>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <AppInput 
                    placeholder="Search plant, sub-system..." 
                    className="pl-10 h-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-100">
                  <tr className="text-gray-500 uppercase font-bold text-[10px] tracking-widest">
                    <th className="px-6 py-4">Plant / Unit</th>
                    <th className="px-6 py-4">Sub-System</th>
                    <th className="px-6 py-4 text-center">System Period</th>
                    <th className="px-6 py-4 text-center">Schedule Month</th>
                    <th className="px-6 py-4 text-center">Date of Testing</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                  {/* Inline Filter Row (Professional FILTOR) */}
                  <tr className="bg-white border-b border-gray-100">
                    <th className="px-4 py-2">
                       <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1.5 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300 bg-gray-50/50"
                        value={tableFilters.plant}
                        onChange={(e) => setTableFilters({...tableFilters, plant: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                       <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1.5 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300 bg-gray-50/50"
                        value={tableFilters.subsystem}
                        onChange={(e) => setTableFilters({...tableFilters, subsystem: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                       <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1.5 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300 bg-gray-50/50"
                        value={tableFilters.period}
                        onChange={(e) => setTableFilters({...tableFilters, period: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                       <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1.5 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300 bg-gray-50/50"
                        value={tableFilters.month}
                        onChange={(e) => setTableFilters({...tableFilters, month: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                       <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1.5 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300 bg-gray-50/50"
                        value={tableFilters.date}
                        onChange={(e) => setTableFilters({...tableFilters, date: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                       <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1.5 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300 bg-gray-50/50"
                        value={tableFilters.status}
                        onChange={(e) => setTableFilters({...tableFilters, status: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2 flex items-center justify-center">
                       <div className="text-[9px] font-black text-gray-200 tracking-[0.2em] uppercase">FILTOR</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRecords.map(record => (
                    <tr key={record.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-bold text-gray-900">{record.plantName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">ID: {record.plantId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-blue-600">{record.subSystemName}</span>
                          <span className="text-[10px] text-gray-400 line-clamp-1">{record.categoryName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="info" className="px-2 py-0.5">{record.cycle}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700 font-medium">{record.scheduleMonth || 'Not Set'}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-medium">
                        {record.dateOfTesting || 'Not Scheduled'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={
                          record.status === 'Completed' ? 'success' : 
                          record.status === 'Overdue' ? 'danger' : 'warning'
                        }>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:bg-blue-50 text-blue-600 font-bold px-2"
                          onClick={() => setEditingRecord(record)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:bg-red-50 text-red-500"
                          onClick={() => {
                            setAuthModal({
                              isOpen: true,
                              type: 'record',
                              targetId: record.id,
                              title: `Delete Testing Record: ${record.tagNumber}`
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                        No scheduled items found matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="p-6 border-b border-gray-50">
               <CardTitle>Plant Inventory</CardTitle>
               <p className="text-sm text-gray-500">Manage plant units and facility records</p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                   {plants.map(plant => {
                     const subSystem = subSystems.find(s => s.id === plant.subSystemId);
                     return (
                      <div key={plant.id} className="p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all group">
                         <div className="flex items-center justify-between mb-3">
                            <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                               <Building2 className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                              <Badge variant="default" className="font-mono block mb-1">{plant.code}</Badge>
                              {subSystem && <Badge variant="info" className="text-[9px] uppercase tracking-tighter opacity-70">{subSystem.name}</Badge>}
                            </div>
                         </div>
                         <h3 className="font-bold text-gray-900 mb-1">{plant.name}</h3>
                         <p className="text-xs text-gray-400 mb-4">{subSystem ? `In: ${subSystem.name}` : 'Global Inventory Unit'}</p>
                         <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="flex-1 text-gray-400 hover:text-blue-600">
                               <Edit3 className="h-4 w-4 mr-2" /> Details
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 text-gray-400 hover:text-red-500"
                              onClick={() => {
                                setAuthModal({
                                  isOpen: true,
                                  type: 'plant',
                                  targetId: plant.id,
                                  title: `Delete Facility: ${plant.name}`
                                });
                              }}
                            >
                               <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                         </div>
                      </div>
                     );
                   })}
               </div>
            </CardContent>
          </>
        )}
      </Card>

      <RecordEditModal 
        isOpen={!!editingRecord || isAddScheduleOpen}
        record={editingRecord}
        isNew={isAddScheduleOpen}
        onClose={() => {
          setEditingRecord(null);
          setIsAddScheduleOpen(false);
        }}
        onSave={loadData}
      />

      <AdminAuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        onConfirm={handleConfirmAuth}
        actionTitle={authModal.title}
      />

      <Dialog isOpen={isAddPlantOpen} onClose={() => setIsAddPlantOpen(false)} title="Add New Facility">
        <div className="space-y-4">
          <AppInput 
            label="Plant Code" 
            placeholder="e.g. UNIT-10" 
            value={newPlant.code}
            onChange={(e) => setNewPlant({...newPlant, code: e.target.value})}
          />
          <AppInput 
            label="Plant Name" 
            placeholder="e.g. Steam Plant" 
            value={newPlant.name}
            onChange={(e) => setNewPlant({...newPlant, name: e.target.value})}
          />
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Unit Type Group</label>
             <select 
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              value={(newPlant as any).unitType || ''}
              onChange={(e) => setNewPlant({...newPlant, unitType: e.target.value} as any)}
             >
               <option value="">Select Unit Group...</option>
               <option value="Main Process">Main Process Units</option>
               <option value="Storage/Tank Farm">Storage & Tank Farms</option>
               <option value="Offsites/Utility">Offsites & Utilities</option>
               <option value="Admin/General">Admin & General Area</option>
             </select>
          </div>
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Storage Folder (Sub-System)</label>
             <select 
              className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              value={newPlant.subSystemId}
              onChange={(e) => setNewPlant({...newPlant, subSystemId: e.target.value})}
             >
               <option value="">Select Folder...</option>
               {subSystems.map(s => (
                 <option key={s.id} value={s.id}>
                   {s.name} ({categories.find(c => c.id === s.categoryId)?.name || 'Unknown'})
                 </option>
               ))}
             </select>
          </div>
          <Button onClick={handleAddPlant} className="w-full">Create Plant</Button>
        </div>
      </Dialog>

      <Dialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Bulk Import Plants">
        <div className="space-y-6 text-sm">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <p className="font-bold mb-1 flex items-center">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Option 1: Upload Excel File (.xlsx, .xls)
              </p>
              <p className="text-[11px] opacity-80">Excel should have "Plant Code" and "Plant Name" columns.</p>
              
              <input 
                type="file" 
                ref={excelInputRef}
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleExcelImport}
              />
              <Button 
                onClick={() => excelInputRef.current?.click()} 
                className="mt-3 w-full bg-white text-blue-600 hover:bg-blue-50 border-blue-200"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Excel File
              </Button>
            </div>

            <div className="relative">
               <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-gray-100"></div>
               <span className="relative z-10 bg-white px-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest mx-auto block w-fit">OR</span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase">Option 2: Paste CSV Data</label>
              <textarea 
                className="w-full h-32 rounded-lg border border-gray-300 p-3 text-xs font-mono focus:border-blue-500 outline-none"
                placeholder="PLANT CODE, PLANT NAME&#10;UNIT-01, Main Reactor&#10;UNIT-02, Cooling Tower"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <Button onClick={() => {
                const lines = importText.split('\n');
                if (lines.length > 1) {
                  lines.slice(1).forEach(l => {
                      const parts = l.split(',');
                      if (parts.length >= 2) {
                        dbApi.savePlant({
                          id: Math.random().toString(36).substr(2, 9),
                          code: parts[0]?.trim() || '',
                          name: parts[1]?.trim() || ''
                        });
                      }
                    });
                    loadData();
                    setIsImportOpen(false);
                    setImportText('');
                }
              }} className="w-full" variant="ghost">
                Process Pasted Content
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
