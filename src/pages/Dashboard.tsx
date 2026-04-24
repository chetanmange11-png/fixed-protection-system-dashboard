import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Search, Filter, Download, 
  Edit3, Trash2, Link as LinkIcon, FileCheck,
  ChevronRight, Home, Building2, Layers, Folder
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { cn } from '../lib/utils';
import { dbApi } from '../db/storage';
import { 
  TestRecord, Plant, SubSystem, SystemCategory, 
  MaintenanceCycle, TestingStatus, HealthCondition, ScheduleMonth 
} from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Dashboard() {
  const { categoryId, subSystemId, plantId } = useParams();
  const navigate = useNavigate();
  
  const [plant, setPlant] = React.useState<Plant | null>(null);
  const [subSystem, setSubSystem] = React.useState<SubSystem | null>(null);
  const [category, setCategory] = React.useState<SystemCategory | null>(null);
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [healthFilter, setHealthFilter] = React.useState<string>('All');
  const [users, setUsers] = React.useState<{id: string, name: string}[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [recordToDelete, setRecordToDelete] = React.useState<string | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<TestRecord | null>(null);
  const [formData, setFormData] = React.useState<Partial<TestRecord>>({
    cycle: 'Q1',
    scheduleMonth: 'January',
    status: 'Pending',
    healthCondition: 'Satisfactory',
    dateOfTesting: new Date().toISOString().split('T')[0]
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const load = async () => {
      await dbApi.init();
      const [allPlants, allSubs, allCats, allUsers, allRecords] = await Promise.all([
        dbApi.getPlants(),
        dbApi.getSubSystems(),
        dbApi.getCategories(),
        dbApi.getUsers(),
        dbApi.getTestRecords()
      ]);
      
      setUsers(allUsers.filter(u => u.role === 'Admin' || u.role === 'Technician'));
      setPlant(allPlants.find(p => p.id === plantId) || null);
      setSubSystem(allSubs.find(s => s.id === subSystemId) || null);
      setCategory(allCats.find(c => c.id === categoryId) || null);
      
      setRecords(allRecords.filter(r => 
        r.plantId === plantId && r.subSystemId === subSystemId
      ));
    };
    load();
  }, [plantId, subSystemId, categoryId]);

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

  const handleOpenModal = (record?: TestRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({ ...record });
    } else {
      setEditingRecord(null);
      setFormData({
        cycle: 'Q1',
        scheduleMonth: 'January',
        status: 'Pending',
        healthCondition: 'Satisfactory',
        dateOfTesting: new Date().toISOString().split('T')[0],
        tagNumber: '',
        location: '',
        deficiency: '',
        actionTaken: '',
        testedBy: '',
        plantPersonnel: '',
        attachmentUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!plant || !subSystem || !category) {
      alert("Context missing. Cannot save test record.");
      return;
    }

    if (!formData.tagNumber) {
      alert("Tag Number is required.");
      return;
    }
    
    try {
      const record: TestRecord = {
        ...formData as TestRecord,
        id: editingRecord?.id || Math.random().toString(36).substr(2, 9),
        plantId: plant.id,
        plantName: plant.name,
        categoryId: category.id,
        categoryName: category.name,
        subSystemId: subSystem.id,
        subSystemName: subSystem.name,
        updatedAt: new Date().toISOString()
      };
      
      await dbApi.saveTestRecord(record);
      const allRecords = await dbApi.getTestRecords();
      setRecords(allRecords.filter(r => r.plantId === plantId && r.subSystemId === subSystemId));
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Save Test Record Error:", error);
      alert("Failed to save record: " + (error.message || 'Unknown error'));
    }
  };

  const handleConfirmDelete = async () => {
    if (recordToDelete) {
      await dbApi.deleteTestRecord(recordToDelete);
      const allRecords = await dbApi.getTestRecords();
      setRecords(allRecords.filter(r => 
        r.plantId === plantId && r.subSystemId === subSystemId
      ));
      setRecordToDelete(null);
      setIsAdminAuthOpen(false);
    }
  };

  const exportExcel = () => {
    const data = records.map(r => ({
      'Plant Name': r.plantName,
      'Category': r.categoryName,
      'Sub System': r.subSystemName,
      'Tag Number': r.tagNumber,
      'Location': r.location,
      'Cycle': r.cycle,
      'Date': r.dateOfTesting,
      'Status': r.status,
      'Health': r.healthCondition,
      'Deficiency': r.deficiency,
      'Action Taken': r.actionTaken,
      'Tested By': r.testedBy
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Records');
    XLSX.writeFile(wb, `${plant?.name}_${subSystem?.name}_Testing.xlsx`);
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesHealth = healthFilter === 'All' || r.healthCondition === healthFilter;
    return matchesSearch && matchesStatus && matchesHealth;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'System Categories', path: '/categories', icon: Folder },
          { label: category?.name || 'Category', path: `/categories/${categoryId}`, icon: Layers },
          { label: subSystem?.name || 'Sub-System', path: `/categories/${categoryId}/${subSystemId}`, icon: Layers },
          { label: plant?.name || 'Plant', active: true, icon: Building2 }
        ]}
      />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/categories/${categoryId}/${subSystemId}`)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{plant?.code}</span>
              <h1 className="text-2xl font-bold text-gray-900">{plant?.name}</h1>
            </div>
            <p className="text-sm text-gray-500">{category?.name} / {subSystem?.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Test Record
          </Button>
        </div>
      </motion.div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tags', val: records.length, color: 'blue' },
          { label: 'Completed', val: records.filter(r => r.status === 'Completed').length, color: 'green' },
          { label: 'Pending', val: records.filter(r => r.status === 'Pending').length, color: 'amber' },
          { label: 'Deficiencies', val: records.filter(r => r.healthCondition === 'Unsatisfactory').length, color: 'red' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow border-none shadow-sm h-full group">
              <CardContent className="p-5">
                <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-2">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-black text-gray-900 leading-none">{stat.val}</p>
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform", 
                    stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                    stat.color === 'green' ? 'bg-green-50 text-green-600' : 
                    stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  )}>
                    <FileCheck className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col space-y-4 pb-6">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Testing Status & Compliance</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <AppInput 
                placeholder="Search tag or location..." 
                className="pl-10 h-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
             <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Health:</span>
                {['All', 'Satisfactory', 'Unsatisfactory'].map(health => (
                  <button
                    key={health}
                    onClick={() => setHealthFilter(health)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                      healthFilter === health 
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {health}
                  </button>
                ))}
             </div>
             
             <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />

             <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status:</span>
                {['All', 'Completed', 'Pending', 'Overdue', 'Under Maintenance'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                      statusFilter === status 
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {status}
                  </button>
                ))}
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <th className="px-6 py-4">Tag No / Location</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Health Condition</th>
                <th className="px-6 py-4">Deficiency</th>
                <th className="px-6 py-4 text-center">Evidence</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length > 0 ? filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{r.tagNumber}</div>
                    <div className="text-xs text-gray-400">{r.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info" className="text-[10px]">{r.cycle}</Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{r.scheduleMonth || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-500">{r.dateOfTesting}</td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      r.status === 'Completed' ? 'success' : 
                      r.status === 'Overdue' ? 'danger' : 
                      r.status === 'Pending' ? 'warning' : 'default'
                    }>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={r.healthCondition === 'Satisfactory' ? 'success' : 'danger'}>
                      {r.healthCondition}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-gray-500">
                    {r.deficiency || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {r.attachmentUrl ? (
                      <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center">
                        <LinkIcon className="h-4 w-4 mr-1" />
                        View
                      </a>
                    ) : (
                      <span className="text-gray-300">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(r)}>
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setRecordToDelete(r.id);
                      setIsAdminAuthOpen(true);
                    }}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FileCheck className="h-10 w-10 text-gray-200 mb-2" />
                        <p>No testing records found for this unit.</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingRecord ? "Update Test Record" : "Add New Test Record"}
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 md:col-span-2 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Target Context</p>
              <h4 className="font-bold text-gray-900">{plant?.name} • {category?.name} • {subSystem?.name}</h4>
            </div>
            <Badge variant="info">Ref: {plant?.code}</Badge>
          </div>

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
              placeholder="e.g. Ground Floor, Sector A" 
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
                className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            <label className="text-sm font-medium text-gray-700">Deficiency Details (If any)</label>
            <textarea 
              className="w-full min-h-[100px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Describe observation..."
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
              label="Action Taken / Remarks" 
              placeholder="Corrective actions..." 
              value={formData.actionTaken}
              onChange={(e) => setFormData({...formData, actionTaken: e.target.value})}
            />
          </div>

          <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
             <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <AppInput 
                    label="Test Evidence (Photo/File)" 
                    placeholder="Attachment data..." 
                    className="bg-white"
                    value={formData.attachmentUrl?.startsWith('data:') ? 'Image Captured ✓' : formData.attachmentUrl}
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
                    className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => fileInputRef.current?.click()}
                   >
                     <Edit3 className="h-4 w-4 mr-2" />
                     Take Picture / Upload
                   </Button>
                   {formData.attachmentUrl && (
                     <Button 
                      variant="ghost" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setFormData({...formData, attachmentUrl: ''})}
                     >
                        Clear
                     </Button>
                   )}
                </div>
             </div>
             {formData.attachmentUrl?.startsWith('data:') && (
                <div className="mt-3 relative w-32 h-32 rounded-lg overflow-hidden border bg-white flex items-center justify-center">
                   <img src={formData.attachmentUrl} className="w-full h-full object-contain" alt="Preview" referrerPolicy="no-referrer" />
                </div>
             )}
          </div>
          
          <div className="flex justify-end space-x-3 md:col-span-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Discard</Button>
            <Button className="px-8" onClick={handleSave}>Save Record</Button>
          </div>
        </div>
      </Dialog>

      <AdminAuthModal 
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onConfirm={handleConfirmDelete}
        actionTitle="Delete Testing Record"
      />
    </div>
  );
}
