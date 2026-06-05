import * as React from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Download, 
  FileText, 
  Filter, 
  User, 
  Building2, 
  MoreVertical, 
  Trash2, 
  Eye,
  ArrowLeft,
  Settings,
  ShieldAlert,
  ChevronDown,
  Printer,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Badge } from '../components/ui/Badge';
import { dbApi } from '../db/storage';
import { EquipmentIssue, Plant, FinancialYear, User as AppUser, EquipmentMaster } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function EquipmentIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = React.useState<EquipmentIssue[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [officers, setOfficers] = React.useState<AppUser[]>([]);
  const [equipmentList, setEquipmentList] = React.useState<EquipmentMaster[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isManageEqModalOpen, setIsManageEqModalOpen] = React.useState(false);
  const [selectedIssue, setSelectedIssue] = React.useState<EquipmentIssue | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [activeYear, setActiveYear] = React.useState<FinancialYear>('2024-25');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingEq, setIsSavingEq] = React.useState(false);

  const [formData, setFormData] = React.useState<Partial<EquipmentIssue>>({
    priority: 'Medium',
    status: 'Open',
    dateOfIssue: new Date().toISOString().split('T')[0]
  });

  const [eqFormData, setEqFormData] = React.useState<Partial<EquipmentMaster>>({
    status: 'Available',
    type: 'Extinguisher'
  });

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [allIssues, allPlants, allUsers, currentYear, allEquipment] = await Promise.all([
      dbApi.getEquipmentIssues(),
      dbApi.getPlants(),
      dbApi.getUsers(),
      dbApi.getActiveYear(),
      dbApi.getEquipmentMaster()
    ]);
    setIssues(allIssues);
    setPlants(allPlants);
    setOfficers(allUsers.filter(u => u.role === 'Admin' || u.role === 'Technician'));
    setEquipmentList(allEquipment);
    setActiveYear(currentYear);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleSaveEquipment = async () => {
    if (!eqFormData.name || !eqFormData.id || !eqFormData.type) {
      alert('Please fill all mandatory fields (Name, Serial/ID, Type)');
      return;
    }
    setIsSavingEq(true);
    try {
      const eq: EquipmentMaster = {
        ...(eqFormData as EquipmentMaster),
        financialYear: activeYear,
        createdAt: eqFormData.createdAt || new Date().toISOString()
      };
      await dbApi.saveEquipmentMaster(eq);
      await loadData();
      setEqFormData({ status: 'Available', type: 'Extinguisher' });
    } catch (err: any) {
      alert("Failed to save equipment: " + err.message);
    } finally {
      setIsSavingEq(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (confirm('Permanently delete this equipment from the master list?')) {
      await dbApi.deleteEquipmentMaster(id);
      await loadData();
    }
  };

  const handleSave = async () => {
    if (!formData.equipmentId || !formData.plantPerson || !formData.fireOfficerId) {
      alert('Please fill all mandatory fields (Equipment, Plant Person, Fire Officer)');
      return;
    }

    setIsSaving(true);
    try {
      const selectedEquipment = equipmentList.find(e => e.id === formData.equipmentId);
      // Auto-assign plant from equipment if not explicitly overridden (or set automatically in form)
      const targetPlantId = formData.plantId || selectedEquipment?.plantId;
      const selectedPlant = plants.find(p => p.id === targetPlantId);
      const selectedOfficer = officers.find(o => o.id === formData.fireOfficerId);
      
      const issue: EquipmentIssue = {
        ...(formData as EquipmentIssue),
        id: formData.id || Math.random().toString(36).substr(2, 9),
        plantId: targetPlantId || '',
        plantName: selectedPlant?.name || '',
        equipmentName: selectedEquipment?.name || formData.equipmentName || '',
        fireOfficerName: selectedOfficer?.name || '',
        financialYear: activeYear,
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbApi.saveEquipmentIssue(issue);

      // Also update the Equipment Master status
      if (selectedEquipment) {
        await dbApi.saveEquipmentMaster({
          ...selectedEquipment,
          status: 'Has Active Issue'
        });
      }

      await loadData();
      setIsAddModalOpen(false);
      setFormData({ priority: 'Medium', status: 'Open', dateOfIssue: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      alert("Failed to save issue: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this equipment issue record?')) {
      await dbApi.deleteEquipmentIssue(id);
      await loadData();
    }
  };

  const resolveIssue = async (issue: EquipmentIssue) => {
    const updated = {
      ...issue,
      status: 'Resolved' as const,
      resolutionDate: new Date().toISOString().split('T')[0]
    };
    await dbApi.saveEquipmentIssue(updated);
    
    // Also update EquipmentMaster to "Available"
    if (issue.equipmentId) {
      const eq = equipmentList.find(e => e.id === issue.equipmentId);
      if (eq) {
        await dbApi.saveEquipmentMaster({
          ...eq,
          status: 'Available'
        });
      }
    }
    
    await loadData();
  };

  // Advanced Reporting
  const generateMonthlyReport = (type: 'pdf' | 'excel', month?: string) => {
    try {
      const data = issues.filter(i => {
        if (!month) return true;
        return i.dateOfIssue?.includes(month);
      });

      if (data.length === 0) {
        alert("No issues found to export for the selected period.");
        return;
      }

      if (type === 'excel') {
        const exportData = data.map(i => ({
          'Date of Issue': i.dateOfIssue,
          'Plant': i.plantName,
          'Equipment': i.equipmentName,
          'Priority': i.priority,
          'Status': i.status,
          'Assigned Officer': i.fireOfficerName,
          'Reported By': i.plantPerson,
          'Resolution Date': i.resolutionDate || 'Pending'
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
        XLSX.writeFile(wb, `Equipment_Issues_Report_${month || 'Monthly'}_${activeYear}_${new Date().getTime()}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`EQUIPMENT ISSUES REPORT - ${month || 'PERIODAL'}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Financial Year: ${activeYear} | Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableBody = data.map(i => [
          i.dateOfIssue,
          i.plantName,
          i.equipmentName,
          i.priority,
          i.status,
          i.fireOfficerName
        ]);

        autoTable(doc, {
           startY: 35,
           head: [['Date', 'Plant', 'Equipment', 'Priority', 'Status', 'Officer']],
           body: tableBody,
           theme: 'grid',
           headStyles: { fillColor: [239, 68, 68] }
        });
        doc.save(`Equipment_Issues_${month || 'Report'}_${new Date().getTime()}.pdf`);
      }
    } catch (err: any) {
      console.error("Report Generation Error:", err);
      alert("Failed to generate report: " + err.message);
    }
  };

  const filteredIssues = issues.filter(i => 
    (i.plantName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (i.equipmentName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (i.fireOfficerName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (i.plantPerson || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'Open').length,
    high: issues.filter(i => i.priority === 'High' && i.status === 'Open').length,
    resolved: issues.filter(i => i.status === 'Resolved').length
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/others')} className="rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <AlertTriangle className="h-8 w-8 mr-3 text-red-500" />
              EQUIPMENT ISSUES REGISTER
            </h1>
            <p className="text-gray-500 font-medium">Faulty equipment tracking and officer assignment portal.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <Button variant="outline" onClick={() => setIsManageEqModalOpen(true)} className="rounded-xl border-gray-200">
             <Settings className="h-4 w-4 mr-2 text-gray-500" />
             Manage Equipment List
           </Button>
           <div className="relative group">
              <Button variant="outline" className="rounded-xl border-gray-200">
                <Download className="h-4 w-4 mr-2 text-red-500" />
                Export Reports
                <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
              </Button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                 <button onClick={() => generateMonthlyReport('excel')} className="w-full px-4 py-3 text-left text-xs font-black uppercase hover:bg-gray-50 text-gray-700 flex items-center border-b border-gray-50">
                    <Download className="h-3 w-3 mr-2 text-emerald-500" /> Annual Excel 
                 </button>
                 <button onClick={() => generateMonthlyReport('pdf')} className="w-full px-4 py-3 text-left text-xs font-black uppercase hover:bg-gray-50 text-gray-700 flex items-center">
                    <FileText className="h-3 w-3 mr-2 text-red-500" /> Annual PDF
                 </button>
              </div>
           </div>
           <Button onClick={() => {
              setFormData({ priority: 'Medium', status: 'Open', dateOfIssue: new Date().toISOString().split('T')[0] });
              setIsAddModalOpen(true);
           }} className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100">
             <Plus className="h-4 w-4 mr-2" />
             Log New Issue
           </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="bg-white border-red-50">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Faults</p>
               <h3 className="text-3xl font-black text-gray-900">{stats.total}</h3>
            </CardContent>
         </Card>
         <Card className="bg-red-600 border-none text-white shadow-xl shadow-red-100">
            <CardContent className="p-6">
               <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Active Issues</p>
               <h3 className="text-3xl font-black">{stats.open}</h3>
            </CardContent>
         </Card>
         <Card className="bg-white border-orange-50">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">High Priority</p>
               <h3 className="text-3xl font-black text-gray-900">{stats.high}</h3>
            </CardContent>
         </Card>
         <Card className="bg-emerald-500 border-none text-white shadow-xl shadow-emerald-100">
            <CardContent className="p-6">
               <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Resolved Today</p>
               <h3 className="text-3xl font-black">{stats.resolved}</h3>
            </CardContent>
         </Card>
      </div>

      {/* Search & Period Filter */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="FILTER BY PLANT, EQUIPMENT / SUB-SYSTEM FOLDER OR OFFICER..."
            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
           <div className="px-4 py-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center">
             <Filter className="h-3 w-3 mr-2" />
             FILTER FY {activeYear}
           </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredIssues.map((issue, idx) => (
             <motion.div
               key={issue.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.05 }}
               layout
             >
               <Card className={cn(
                 "border-none hover:shadow-xl transition-all duration-300 group cursor-pointer",
                 issue.status === 'Resolved' ? "bg-gray-50 opacity-70" : "bg-white shadow-sm ring-1 ring-gray-100"
               )}>
                  <CardContent className="p-0">
                     <div className={cn(
                       "h-1.5 w-full",
                       issue.priority === 'High' ? "bg-red-500" : issue.priority === 'Medium' ? "bg-amber-400" : "bg-blue-400"
                     )} />
                     <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                           <div className="flex items-center space-x-3">
                              <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center",
                                issue.status === 'Resolved' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                              )}>
                                 {issue.status === 'Resolved' ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                              </div>
                              <div>
                                 <h3 className="font-black text-gray-900 leading-tight truncate max-w-[150px]">{issue.equipmentName}</h3>
                                 {issue.equipmentId && (
                                   <p className="text-[10px] font-bold text-gray-400 font-mono tracking-widest mt-0.5 mb-0.5">Equipment ID: {issue.equipmentId}</p>
                                 )}
                                 <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-0.5">{issue.plantName}</p>
                              </div>
                           </div>
                           <Badge 
                             variant={issue.priority === 'High' ? 'danger' : issue.priority === 'Medium' ? 'warning' : 'info'}
                             className="text-[8px] px-2 h-5 font-black uppercase"
                           >
                             {issue.priority} PRIORITY
                           </Badge>
                        </div>

                        <div className="space-y-4">
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200/50">
                                 <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tag Number</p>
                                    <p className="text-xs font-bold text-blue-600 font-mono">
                                       {issue.id.slice(0, 8).toUpperCase()} 
                                    </p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Assigned Officer</p>
                                    <p className="text-xs font-black text-blue-600">{issue.fireOfficerName}</p>
                                 </div>
                              </div>
                              <div>
                                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reported By</p>
                                 <p className="text-xs font-medium text-gray-700 italic">"{issue.plantPerson}"</p>
                              </div>
                           </div>

                           <div className="flex items-center justify-between pt-2">
                              <div className="flex space-x-2">
                                 {issue.status === 'Open' && (
                                   <Button 
                                     size="sm" 
                                     onClick={() => resolveIssue(issue)}
                                     className="h-8 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase hover:bg-emerald-600 hover:text-white px-4 border-none shadow-none"
                                   >
                                     <CheckCircle2 className="h-3 w-3 mr-1.5" /> Resolve
                                   </Button>
                                 )}
                                 <Button 
                                   variant="ghost" 
                                   size="sm"
                                   onClick={() => {
                                      setSelectedIssue(issue);
                                      setIsViewModalOpen(true);
                                   }}
                                   className="h-8 rounded-xl text-[10px] font-black uppercase hover:bg-gray-100"
                                 >
                                   Audit Trail
                                 </Button>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(issue.id)}
                                className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shadow-none"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>
             </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <Dialog 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title={formData.id ? "Modify Issue Report" : "Equipment Issue Log"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Target Plant Facility</label>
                <select 
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                  value={formData.plantId || ''}
                  onChange={(e) => setFormData({...formData, plantId: e.target.value})}
                >
                  <option value="">Select Plant Unit...</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Equipment</label>
                <select 
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                  value={formData.equipmentId || ''}
                  onChange={(e) => {
                    const eqId = e.target.value;
                    const eq = equipmentList.find(x => x.id === eqId);
                    // auto mapping to plant
                    if (eq?.plantId) {
                      setFormData({
                        ...formData, 
                        equipmentId: eqId,
                        equipmentName: eq.name,
                        plantId: eq.plantId
                      });
                    } else {
                      setFormData({...formData, equipmentId: eqId, equipmentName: eq?.name || ''});
                    }
                  }}
                >
                  <option value="">Select Equipment...</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name} ({eq.id})</option>
                  ))}
                </select>
             </div>

             <AppInput 
               label="Reported By (Person)" 
               placeholder="Full name of plant person"
               value={formData.plantPerson || ''}
               onChange={(e) => setFormData({...formData, plantPerson: e.target.value})}
             />

             <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Fire Officer selection</label>
                <select 
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                  value={formData.fireOfficerId || ''}
                  onChange={(e) => setFormData({...formData, fireOfficerId: e.target.value})}
                >
                  <option value="">Select Officer...</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
             </div>

             <AppInput 
               label="Date of Detection" 
               type="date"
               value={formData.dateOfIssue || ''}
               onChange={(e) => setFormData({...formData, dateOfIssue: e.target.value})}
             />

             <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Impact Priority</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                    {['Low', 'Medium', 'High'].map((p) => (
                      <button 
                         key={p}
                         onClick={() => setFormData({...formData, priority: p as any})}
                         className={cn(
                           "flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all",
                           formData.priority === p ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                         )}
                      >{p}</button>
                    ))}
                </div>
             </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
             <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl" disabled={isSaving}>Cancel</Button>
             <Button 
               onClick={handleSave} 
               disabled={isSaving}
               className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100 px-8"
             >
               {isSaving ? "Saving..." : "Save Record"}
             </Button>
          </div>
        </div>
      </Dialog>

      {/* Manage Equipment Modal */}
      <Dialog
        isOpen={isManageEqModalOpen}
        onClose={() => setIsManageEqModalOpen(false)}
        title="Equipment Master List"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <AppInput 
               label="Equipment Name" 
               placeholder="e.g. Main Pump #2"
               value={eqFormData.name || ''}
               onChange={(e) => setEqFormData({...eqFormData, name: e.target.value})}
             />
             <AppInput 
               label="Unique ID / Serial" 
               placeholder="e.g. HYD-001"
               value={eqFormData.id || ''}
               onChange={(e) => setEqFormData({...eqFormData, id: e.target.value})}
             />
             <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Type</label>
                <select 
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                  value={eqFormData.type || ''}
                  onChange={(e) => setEqFormData({...eqFormData, type: e.target.value})}
                >
                  <option value="Hydrant">Hydrant</option>
                  <option value="Extinguisher">Extinguisher</option>
                  <option value="Pump">Pump</option>
                  <option value="Sprinkler">Sprinkler</option>
                  <option value="Detector">Detector</option>
                  <option value="Other">Other</option>
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</label>
                <select 
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                  value={eqFormData.status || ''}
                  onChange={(e) => setEqFormData({...eqFormData, status: e.target.value as any})}
                >
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Has Active Issue">Has Active Issue</option>
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Map to Plant</label>
                <select 
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                  value={eqFormData.plantId || ''}
                  onChange={(e) => setEqFormData({...eqFormData, plantId: e.target.value})}
                >
                  <option value="">Unassigned</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
             <div className="md:col-span-5 flex justify-end mt-2">
                 <Button onClick={handleSaveEquipment} disabled={isSavingEq} className="rounded-xl shadow-lg shadow-red-200 bg-red-600 hover:bg-red-700 text-white">
                   {isSavingEq ? "Adding..." : "Add Equipment"}
                 </Button>
             </div>
          </div>

          <div className="bg-white border top border-gray-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest leading-none sticky top-0 z-10">
                   <tr>
                      <th className="px-6 py-4 rounded-tl-2xl">Status</th>
                      <th className="px-6 py-4">Serial / ID</th>
                      <th className="px-6 py-4">Equipment Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Plant Mapping</th>
                      <th className="px-6 py-4 rounded-tr-2xl text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {equipmentList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm italic font-medium">
                        No equipment records found. Add one above.
                      </td>
                    </tr>
                  )}
                  {equipmentList.map(eq => {
                    const mappedPlant = plants.find(p => p.id === eq.plantId)?.name || 'Unassigned';
                    return (
                      <tr key={eq.id} className="hover:bg-gray-50/50 group">
                        <td className="px-6 py-4">
                           <div className="flex items-center space-x-2">
                             <div className={cn(
                               "w-2.5 h-2.5 rounded-full shadow-sm",
                               eq.status === 'Available' ? "bg-emerald-500 shadow-emerald-200" :
                               eq.status === 'Has Active Issue' ? "bg-rose-500 shadow-rose-200" : "bg-blue-500 shadow-blue-200"
                             )} />
                             <span className="text-[10px] font-bold text-gray-500 uppercase">{eq.status}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">{eq.id}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900">{eq.name}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{eq.type}</td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-600">{mappedPlant}</td>
                        <td className="px-6 py-4 text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteEquipment(eq.id)} className="h-8 w-8 text-gray-400 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      </Dialog>

      {/* View Detail Modal */}
      <Dialog
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Equipment Audit Detail"
        maxWidth="max-w-lg"
      >
        {selectedIssue && (
          <div className="space-y-6">
             <div className="flex items-center justify-between bg-red-50 -mx-6 -mt-6 p-6">
                <div className="flex items-center space-x-3">
                   <div className="h-12 w-12 bg-red-600 rounded-2xl flex items-center justify-center text-white">
                      <AlertTriangle className="h-6 w-6" />
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-gray-900 leading-none">{selectedIssue.equipmentName}</h4>
                      <p className="text-[10px] font-black text-red-500 uppercase mt-1">Audit Record: {selectedIssue.id}</p>
                   </div>
                </div>
                <Badge variant={selectedIssue.status === 'Resolved' ? 'success' : 'danger'}>{selectedIssue.status}</Badge>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Facility Context</p>
                   <p className="text-sm font-bold text-gray-800 flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedIssue.plantName}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Issue Timestamp</p>
                   <p className="text-sm font-bold text-gray-800 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedIssue.dateOfIssue}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reporting Personnel</p>
                   <p className="text-sm font-bold text-gray-800 flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedIssue.plantPerson}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Security Enforcement</p>
                   <p className="text-sm font-black text-blue-600 flex items-center">
                      <ShieldAlert className="h-4 w-4 mr-2 text-blue-400" />
                      {selectedIssue.fireOfficerName}
                   </p>
                </div>
             </div>

             {selectedIssue.status === 'Resolved' && (
               <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center text-emerald-800 font-bold mb-1">
                     <CheckCircle2 className="h-4 w-4 mr-2" /> Clearance Report
                  </div>
                  <p className="text-xs text-emerald-600">Issue was marked as resolved on {selectedIssue.resolutionDate} following proper maintenance protocol.</p>
               </div>
             )}

             <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <Button variant="ghost" onClick={() => generateMonthlyReport('pdf')} className="rounded-xl text-red-600 hover:bg-red-50">
                   <FileText className="h-4 w-4 mr-2" /> Export Audit PDF
                </Button>
                <div className="flex space-x-3">
                   <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="rounded-xl">Close</Button>
                   {selectedIssue.status === 'Open' && (
                     <Button onClick={() => resolveIssue(selectedIssue)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100">Mark Resolved</Button>
                   )}
                </div>
             </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
