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
import { EquipmentIssue, Plant, FinancialYear, User as AppUser } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function EquipmentIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = React.useState<EquipmentIssue[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [officers, setOfficers] = React.useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [selectedIssue, setSelectedIssue] = React.useState<EquipmentIssue | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [activeYear, setActiveYear] = React.useState<FinancialYear>('2024-25');
  
  const [formData, setFormData] = React.useState<Partial<EquipmentIssue>>({
    priority: 'Medium',
    status: 'Open',
    dateOfIssue: new Date().toISOString().split('T')[0]
  });

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [allIssues, allPlants, allUsers, currentYear] = await Promise.all([
      dbApi.getEquipmentIssues(),
      dbApi.getPlants(),
      dbApi.getUsers(),
      dbApi.getActiveYear()
    ]);
    setIssues(allIssues);
    setPlants(allPlants);
    setOfficers(allUsers.filter(u => u.role === 'Admin' || u.role === 'Technician'));
    setActiveYear(currentYear);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleSave = async () => {
    if (!formData.plantId || !formData.equipmentName || !formData.plantPerson || !formData.fireOfficerId) {
      alert('Please fill all mandatory fields (Plant, Equipment, Plant Person, Fire Officer)');
      return;
    }

    const selectedPlant = plants.find(p => p.id === formData.plantId);
    const selectedOfficer = officers.find(o => o.id === formData.fireOfficerId);
    
    const issue: EquipmentIssue = {
      ...(formData as EquipmentIssue),
      id: formData.id || Math.random().toString(36).substr(2, 9),
      plantName: selectedPlant?.name || '',
      fireOfficerName: selectedOfficer?.name || '',
      financialYear: activeYear,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbApi.saveEquipmentIssue(issue);
    await loadData();
    setIsAddModalOpen(false);
    setFormData({ priority: 'Medium', status: 'Open', dateOfIssue: new Date().toISOString().split('T')[0] });
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
    await loadData();
  };

  // Advanced Reporting
  const generateMonthlyReport = (type: 'pdf' | 'excel', month?: string) => {
     const data = issues.filter(i => {
       if (!month) return true;
       return i.dateOfIssue.includes(month);
     });

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
       XLSX.writeFile(wb, `Equipment_Issues_Report_${month || 'Monthly'}_${activeYear}.xlsx`);
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

       (doc as any).autoTable({
          startY: 35,
          head: [['Date', 'Plant', 'Equipment', 'Priority', 'Status', 'Officer']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] }
       });
       doc.save(`Equipment_Issues_${month || 'Report'}.pdf`);
     }
  };

  const filteredIssues = issues.filter(i => 
    i.plantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.fireOfficerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.plantPerson.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="FILTER BY PLANT, EQUIPMENT OR OFFICER..."
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
                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{issue.plantName}</p>
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
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reported Date</p>
                                    <p className="text-xs font-bold text-gray-800 flex items-center">
                                       <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                                       {issue.dateOfIssue}
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

             <AppInput 
               label="Faulty Equipment Name" 
               placeholder="Rectangular input box"
               value={formData.equipmentName || ''}
               onChange={(e) => setFormData({...formData, equipmentName: e.target.value})}
             />

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
             <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancel</Button>
             <Button onClick={handleSave} className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100 px-8">Save Record</Button>
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
