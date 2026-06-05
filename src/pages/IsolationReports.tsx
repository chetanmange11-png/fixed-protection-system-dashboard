import * as React from 'react';
import { 
  Plus, 
  Search, 
  ShieldAlert, 
  FileText, 
  Calendar, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  ArrowRight,
  ArrowLeft,
  Filter,
  Eye,
  Archive,
  AlertTriangle,
  Building2,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { Badge } from '../components/ui/Badge';
import { dbApi } from '../db/storage';
import { IsolationReport, Plant, FinancialYear, ValveInfo } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function IsolationReports() {
  const navigate = useNavigate();
  const [reports, setReports] = React.useState<IsolationReport[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [reportToDelete, setReportToDelete] = React.useState<IsolationReport | null>(null);
  const [selectedReport, setSelectedReport] = React.useState<IsolationReport | null>(null);
  const [activeYear, setActiveYear] = React.useState<FinancialYear>('2024-25');
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [formData, setFormData] = React.useState<Partial<IsolationReport>>({
    plannedUnplanned: 'Planned',
    fireWaterIsolationType: 'Partial',
    status: 'Active',
    dateOfIsolation: new Date().toISOString().split('T')[0],
    valves: [{ id: Math.random().toString(36).substring(2, 9), tagName: '', status: 'Good', closed: false, opened: false }]
  });

  const approvalFileRef = React.useRef<HTMLInputElement>(null);
  const checklistFileRef = React.useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [allReports, allPlants, currentYear] = await Promise.all([
      dbApi.getIsolationReports(),
      dbApi.getPlants(),
      dbApi.getActiveYear()
    ]);
    setReports(allReports);
    setPlants(allPlants);
    setActiveYear(currentYear);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'approvalFormatUrl' | 'checklistUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.plantName || !formData.affectedPlant || !formData.affectedArea || !formData.detailsOfJob) {
      alert('Please fill all mandatory fields (Plant, Affected Plant, Affected Area, Details of Job)');
      return;
    }
    
    if (formData.valves?.some(v => v.status === 'Passing') && !formData.safetyNote) {
       alert("Safety Note is mandatory when a valve is passing.");
       return;
    }
    
    if (!formData.valves || formData.valves.length === 0) {
       alert("At least one valve must be isolated.");
       return;
    }
    
    // Safety Logic
    if (formData.status === 'Active' && !formData.valves.every(v => v.closed)) {
       alert("All valves must be checked as Start (Closed) before saving an active isolation.");
       return;
    }
    
    if (formData.status === 'Closed' && !formData.valves.every(v => v.opened)) {
       alert("Cannot close isolation - not all valves are marked as Complete (Opened).");
       return;
    }

    setIsSaving(true);
    try {
      const report: IsolationReport = {
        ...(formData as IsolationReport),
        id: formData.id || Math.random().toString(36).substr(2, 9),
        plantId: formData.plantName,
        plantName: formData.plantName || '',
        financialYear: activeYear,
        status: formData.status || 'Active',
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbApi.saveIsolationReport(report);
      await loadData();
      setIsAddModalOpen(false);
      setFormData({
        plannedUnplanned: 'Planned',
        fireWaterIsolationType: 'Partial',
        status: 'Active',
        dateOfIsolation: new Date().toISOString().split('T')[0],
        valves: [{ id: Math.random().toString(36).substring(2, 9), tagName: '', status: 'Good', closed: false, opened: false }]
      });
    } catch (err: any) {
      alert("Failed to save isolation report: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (report: IsolationReport) => {
    setReportToDelete(report);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      try {
        const updated = { ...reportToDelete, deleted: true };
        await dbApi.saveIsolationReport(updated);
        await loadData();
      } catch (err: any) {
        alert("Failed to delete report: " + err.message);
      } finally {
        setIsDeleteModalOpen(false);
        setReportToDelete(null);
      }
    }
  };

  const toggleStatus = async (report: IsolationReport) => {
    if (report.status === 'Active') {
      if (!report.valves?.every(v => v.opened)) {
         alert("Cannot clear/close isolation until all valves have their 'Opened' checkbox ticked.");
         return; // Need to edit record to open them
      }
    }
    
    const updated = {
      ...report,
      status: report.status === 'Active' ? 'Closed' as const : 'Active' as const
    };
    await dbApi.saveIsolationReport(updated);
    await loadData();
  };

  const exportPDF = (report: IsolationReport) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('ISOLATION REPORT', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text(`Ref ID: ${report.id} | Generated: ${new Date().toLocaleString()}`, 14, 32);

    const body = [
      ['FIELD', 'VALUE'],
      ['Plant Unit', report.plantName],
      ['Type of Isolation', report.plannedUnplanned],
      ['Date of Isolation (Start)', `${report.dateOfIsolation} ${report.timeOfIsolation || ''}`],
      ['Date of Isolation (Complete)', report.dateOfIsolationComplete ? `${report.dateOfIsolationComplete} ${report.timeOfIsolationComplete || ''}` : 'N/A'],
      ['Fire Water Isolation', report.fireWaterIsolationType],
      ['Affected Plant', report.affectedPlant],
      ['Affected Area', report.affectedArea],
      ['Valve to be Isolated', report.valveToBeIsolated || 'N/A'],
      ['Line Position', report.linePosition || 'N/A'],
      ['Job Details', report.detailsOfJob],
      ['Current Status', report.status],
      ['Created At', new Date(report.createdAt).toLocaleString()],
    ];

    autoTable(doc, {
      startY: 40,
      head: [body[0]],
      body: body.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    doc.save(`Isolation_Report_${report.id}.pdf`);
  };

  const exportExcel = () => {
    const data = reports.map(r => ({
      'ID': r.id,
      'Plant Unit': r.plantName,
      'Planned/Unplanned': r.plannedUnplanned,
      'Start Date': r.dateOfIsolation,
      'Start Time': r.timeOfIsolation || '',
      'Complete Date': r.dateOfIsolationComplete || '',
      'Complete Time': r.timeOfIsolationComplete || '',
      'Isolation Type': r.fireWaterIsolationType,
      'Affected Plant': r.affectedPlant,
      'Affected Area': r.affectedArea,
      'Valve': r.valveToBeIsolated || '',
      'Position': r.linePosition || '',
      'Details': r.detailsOfJob,
      'Status': r.status,
      'Financial Year': r.financialYear
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Isolation Reports");
    XLSX.writeFile(wb, `Isolation_Reports_Export_${activeYear}.xlsx`);
  };

  const filteredReports = reports.filter(r => 
    (r.plantName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.affectedPlant || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.affectedArea || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.detailsOfJob || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const stats = {
    total: reports.length,
    active: reports.filter(r => r.status === 'Active').length,
    closed: reports.filter(r => r.status === 'Closed').length
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/others')} className="rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <ShieldAlert className="h-8 w-8 mr-3 text-blue-600" />
              ISOLATION REPORTS
            </h1>
            <p className="text-gray-500 font-medium mt-1">Management of active plant isolations and job safety tracking.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportExcel} className="rounded-xl border-gray-200">
            <Download className="h-4 w-4 mr-2 text-emerald-600" />
            Excel Export
          </Button>
          <Button onClick={() => {
      setFormData({
        plannedUnplanned: 'Planned',
        fireWaterIsolationType: 'Partial',
        status: 'Active',
        dateOfIsolation: new Date().toISOString().split('T')[0],
        valves: [{ id: Math.random().toString(36).substring(2, 9), tagName: '', status: 'Good', closed: false, opened: false }]
      });
            setIsAddModalOpen(true);
          }} className="rounded-xl shadow-lg shadow-blue-200">
            <Plus className="h-4 w-4 mr-2" />
            New Isolation Record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Total Logs</p>
              <p className="text-3xl font-black text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-amber-100 shadow-sm">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Active Isolations</p>
              <p className="text-3xl font-black text-gray-900">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-emerald-100 shadow-sm">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Safety Cleared</p>
              <p className="text-3xl font-black text-gray-900">{stats.closed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="FILTER BY PLANT, AREA OR JOB DETAILS..."
            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
           <div className="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center">
             <Filter className="h-3 w-3 mr-2" />
             Filtering FY {activeYear}
           </div>
        </div>
      </div>

      {/* Grid of Isolation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredReports.map((report, idx) => (
            <motion.div
              key={report.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={cn(
                "group hover:shadow-xl transition-all duration-300 overflow-hidden border-none cursor-pointer",
                report.status === 'Active' ? "bg-white shadow-sm" : "bg-gray-50 opacity-80"
              )}>
                {report.status === 'Active' ? (
                  <div className="h-1.5 w-full bg-amber-400" />
                ) : (
                  <div className="h-1.5 w-full bg-emerald-500" />
                )}
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                        report.status === 'Active' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {report.status === 'Active' ? <Clock className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{report.plantName}</h3>
                        <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {report.dateOfIsolation}
                        </div>
                      </div>
                    </div>
                    <Badge variant={report.status === 'Active' ? 'warning' : 'success'} className="px-3 py-1 rounded-full text-[10px] font-black uppercase">
                      {report.status}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50/50 p-2 rounded-xl">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Isolation Type</p>
                        <p className="text-xs font-bold text-gray-700">{report.plannedUnplanned}</p>
                      </div>
                      <div className="bg-gray-50/50 p-2 rounded-xl">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Fire Water</p>
                        <p className="text-xs font-bold text-blue-600">{report.fireWaterIsolationType}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                           <ShieldAlert className="h-3 w-3 mr-1" />
                           Valves Isolated
                         </p>
                         <p className="text-sm font-bold text-gray-800 ml-4 truncate">
                           {report.valves?.length ? `${report.valves.length} Valve(s) Isolated` : (report.valveToBeIsolated ? '1 Valve Isolated' : 'None')}
                         </p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                           <FileText className="h-3 w-3 mr-1" />
                           Job Details
                         </p>
                         <p className="text-sm font-medium text-gray-600 ml-4 line-clamp-2 italic">"{report.detailsOfJob}"</p>
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-2">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600"
                         onClick={() => {
                           setSelectedReport(report);
                           setIsViewModalOpen(true);
                         }}
                       >
                         <Eye className="h-4 w-4 mr-2" /> View Details
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600"
                         onClick={() => handleDelete(report)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredReports.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-40">
            <Archive className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-xl font-black text-gray-900 tracking-tight uppercase">No Isolation Records Found</p>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mt-2">Try clearing your search or adding a new record</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title={formData.id ? "Edit Isolation Report" : "New Isolation Register Entry"}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Isolation Taken By Plant</label>
              <select 
                className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.plantName || ''}
                onChange={(e) => setFormData({...formData, plantName: e.target.value})}
              >
                <option value="">Select Plant Unit...</option>
                {['ETTF-2', 'SBR', 'TF-1'].map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Planned/Unplanned</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                     <button 
                       onClick={() => setFormData({...formData, plannedUnplanned: 'Planned'})}
                       className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                        formData.plannedUnplanned === 'Planned' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                       )}
                     >Planned</button>
                     <button 
                       onClick={() => setFormData({...formData, plannedUnplanned: 'Unplanned'})}
                       className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                        formData.plannedUnplanned === 'Unplanned' ? "bg-white text-rose-500 shadow-sm" : "text-gray-400"
                       )}
                     >Unplanned</button>
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Fire Water</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                     <button 
                       onClick={() => setFormData({...formData, fireWaterIsolationType: 'Partial'})}
                       className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                        formData.fireWaterIsolationType === 'Partial' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                       )}
                     >Partial</button>
                     <button 
                       onClick={() => setFormData({...formData, fireWaterIsolationType: 'Total'})}
                       className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                        formData.fireWaterIsolationType === 'Total' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                       )}
                     >Total</button>
                  </div>
               </div>
            </div>

            {/* Start Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Date of Isolation (Start)</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date"
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 font-mono"
                  value={formData.dateOfIsolation || ''}
                  onChange={(e) => setFormData({...formData, dateOfIsolation: e.target.value})}
                />
                <input 
                  type="time"
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 font-mono"
                  value={formData.timeOfIsolation || ''}
                  onChange={(e) => setFormData({...formData, timeOfIsolation: e.target.value})}
                />
              </div>
            </div>

            {/* Complete Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Date of Isolation Complete</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date"
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 font-mono"
                  value={formData.dateOfIsolationComplete || ''}
                  onChange={(e) => setFormData({...formData, dateOfIsolationComplete: e.target.value})}
                />
                <input 
                  type="time"
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 font-mono"
                  value={formData.timeOfIsolationComplete || ''}
                  onChange={(e) => setFormData({...formData, timeOfIsolationComplete: e.target.value})}
                />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
               <AppInput 
                 label="Affected Plant" 
                 placeholder="Enter name of plant specifically impacted"
                 value={formData.affectedPlant || ''}
                 onChange={(e) => setFormData({...formData, affectedPlant: e.target.value})}
               />
               <AppInput 
                label="Affected Area" 
                placeholder="Identify exact piping, tank or process line"
                value={formData.affectedArea || ''}
                onChange={(e) => setFormData({...formData, affectedArea: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
               <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center">
                    <ShieldAlert className="h-4 w-4 mr-2" /> Isolated Valves Configuration
                  </label>
                  <Button variant="outline" size="sm" type="button" onClick={() => setFormData({...formData, valves: [...(formData.valves||[]), { id: Math.random().toString(36).substring(2, 9), tagName: '', status: 'Good', closed: false, opened: false }]})}>
                    + Add Another Valve
                  </Button>
               </div>
               
               {formData.valves?.map((valve, idx) => (
                  <div key={valve.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 bg-white rounded-xl border border-gray-200 shadow-sm relative group">
                     <div className="md:col-span-4 space-y-1.5">
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Tag Name</label>
                       <input type="text" className="w-full h-9 bg-gray-50 border border-gray-100 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20" value={valve.tagName} placeholder="Valve Tag/No..." onChange={(e) => {
                         const newValves = [...(formData.valves || [])];
                         newValves[idx].tagName = e.target.value;
                         setFormData({...formData, valves: newValves});
                       }}/>
                     </div>
                     <div className="md:col-span-3 space-y-1.5">
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                       <select className="w-full h-9 bg-gray-50 border border-gray-100 rounded-lg px-3 text-[11px] font-semibold focus:ring-2 focus:ring-blue-500/20" value={valve.status} onChange={(e) => {
                         const newValves = [...(formData.valves || [])];
                         newValves[idx].status = e.target.value as any;
                         setFormData({...formData, valves: newValves});
                       }}>
                          <option value="Good">Good</option>
                          <option value="Passing" className="text-amber-600 font-bold">Passing</option>
                          <option value="Seized" className="text-rose-500 font-bold">Seized</option>
                       </select>
                     </div>
                     <div className="md:col-span-4 flex items-center justify-around h-9 bg-gray-50 rounded-lg border border-gray-100 px-2 mt-2 md:mt-0">
                       <label className="flex items-center space-x-2 text-[10px] font-bold uppercase cursor-pointer">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={valve.closed} onChange={(e) => {
                            const newValves = [...(formData.valves||[])];
                            newValves[idx].closed = e.target.checked;
                            setFormData({...formData, valves: newValves});
                          }}/>
                          <span>Start (Closed)</span>
                       </label>
                       <div className="w-px h-4 bg-gray-200" />
                       <label className="flex items-center space-x-2 text-[10px] font-bold uppercase cursor-pointer">
                          <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500" checked={valve.opened} onChange={(e) => {
                            const newValves = [...(formData.valves||[])];
                            newValves[idx].opened = e.target.checked;
                            setFormData({...formData, valves: newValves});
                          }}/>
                          <span>Complete (Opened)</span>
                       </label>
                     </div>
                     <div className="md:col-span-1 flex justify-end pb-0.5 mt-2 md:mt-0">
                       <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-rose-500 hover:bg-rose-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={() => {
                          setFormData({...formData, valves: formData.valves?.filter((_, i) => i !== idx)});
                       }}><Trash2 className="h-4 w-4" /></Button>
                     </div>
                  </div>
               ))}

               {formData.valves?.length === 0 && (
                  <p className="text-xs text-rose-500 font-bold p-2 text-center bg-rose-50 rounded-xl">At least one valve must be registered.</p>
               )}
            </div>

            {formData.valves?.some(v => v.status === 'Passing') && (
              <div className="md:col-span-2 space-y-1.5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <label className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1"/> Safety Note (Mandatory)
                </label>
                <p className="text-[10px] text-amber-600 mb-2 font-medium">One or more valves are Passing. Please explain the additional isolation measures taken.</p>
                <textarea 
                  className="w-full h-20 bg-white border border-amber-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none placeholder:text-amber-400/50"
                  placeholder="E.g., Closed secondary block valve tag XYZ-123..."
                  value={formData.safetyNote || ''}
                  onChange={(e) => setFormData({...formData, safetyNote: e.target.value})}
                  required
                />
              </div>
            )}

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
               <AppInput 
                label="Affected Area" 
                placeholder="Identify exact piping, tank or process line"
                value={formData.affectedArea || ''}
                onChange={(e) => setFormData({...formData, affectedArea: e.target.value})}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Line Position</label>
                <select 
                  className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.linePosition || ''}
                  onChange={(e) => setFormData({...formData, linePosition: e.target.value as any})}
                >
                  <option value="">Select Position...</option>
                  <option value="Underground">Underground</option>
                  <option value="Above Ground">Above Ground</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Detail of Job</label>
              <textarea 
                className="w-full h-24 bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="Describe the maintenance or emergency repair task..."
                value={formData.detailsOfJob || ''}
                onChange={(e) => setFormData({...formData, detailsOfJob: e.target.value})}
              />
            </div>

            {/* Document Uploads */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => approvalFileRef.current?.click()}>
               <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Approval Format</p>
               <p className="text-[9px] text-gray-400 mt-1">{formData.approvalFormatUrl ? '✅ Document Uploaded' : 'PDF / JPG / PHOTO'}</p>
               <input type="file" ref={approvalFileRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'approvalFormatUrl')} />
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => checklistFileRef.current?.click()}>
               <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Checklist</p>
               <p className="text-[9px] text-gray-400 mt-1">{formData.checklistUrl ? '✅ Checklist Uploaded' : 'PDF / JPG / PHOTO'}</p>
               <input type="file" ref={checklistFileRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'checklistUrl')} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
             <div className="flex bg-gray-50 p-1 rounded-xl">
                 <button 
                   onClick={() => setFormData({...formData, status: 'Active'})}
                   className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                    formData.status === 'Active' ? "bg-amber-400 text-white shadow-md shadow-amber-100" : "text-gray-400"
                   )}
                 >Active Isolation</button>
                 <button 
                   onClick={() => setFormData({...formData, status: 'Closed'})}
                   className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                    formData.status === 'Closed' ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" : "text-gray-400"
                   )}
                 >Closed / Cleared</button>
             </div>
             <div className="flex space-x-3">
               <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl" disabled={isSaving}>Cancel</Button>
               <Button 
                onClick={handleSave} 
                className="rounded-xl shadow-lg shadow-blue-100 px-8"
                disabled={isSaving || !formData.valves?.length || (formData.status === 'Active' ? !formData.valves?.every(v => v.closed) : !formData.valves?.every(v => v.opened))}
               >
                {isSaving ? "Processing..." : (formData.status === 'Active' ? "Commit Entry" : "Clear Isolation")}
               </Button>
             </div>
          </div>
        </div>
      </Dialog>

      {/* View Details Modal */}
      <Dialog
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Isolation Record Audit"
        maxWidth="max-w-2xl"
      >
        <AnimatePresence>
          {selectedReport && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between p-6 bg-gray-50 -mx-6 -mt-6">
                <div className="flex items-center space-x-3">
                   <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                      <ShieldAlert className="h-6 w-6" />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-gray-900 leading-none">{selectedReport.plantName}</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref ID: {selectedReport.id}</p>
                   </div>
                </div>
                <div className="flex flex-col items-end">
                   <Badge variant={selectedReport.status === 'Active' ? 'warning' : 'success'} className="font-black px-4 py-1">
                      {selectedReport.status}
                   </Badge>
                   <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Verified Audit Record</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Isolation Metadata</p>
                       <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-700">
                          <span className="text-gray-400">Type:</span> <span>{selectedReport.plannedUnplanned}</span>
                          <span className="text-gray-400">Start:</span> <span>{selectedReport.dateOfIsolation} {selectedReport.timeOfIsolation || ''}</span>
                          <span className="text-gray-400">Complete:</span> <span>{selectedReport.dateOfIsolationComplete ? `${selectedReport.dateOfIsolationComplete} ${selectedReport.timeOfIsolationComplete || ''}` : 'N/A'}</span>
                          <span className="text-gray-400">Fire Water:</span> <span>{selectedReport.fireWaterIsolationType}</span>
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Location Details</p>
                       <p className="text-xs font-bold text-gray-900">{selectedReport.affectedPlant}</p>
                       <p className="text-xs text-gray-500 mt-1 italic">{selectedReport.affectedArea}</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Technical Line Info</p>
                          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-700">
                             <span className="text-gray-400">Position:</span> <span>{selectedReport.linePosition || 'N/A'}</span>
                          </div>
                       </div>
                       
                       <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Isolated Valves</p>
                          <div className="space-y-2">
                             {selectedReport.valves?.length ? (
                                selectedReport.valves.map(v => (
                                   <div key={v.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs font-bold border border-gray-100">
                                      <span>{v.tagName || 'Unnamed Tag'}</span>
                                      <div className="flex space-x-2">
                                        <Badge variant={v.status === 'Good' ? 'success' : v.status === 'Passing' ? 'warning' : 'danger'} className="text-[9px] uppercase tracking-wider">{v.status}</Badge>
                                        <Badge variant={v.closed ? 'success' : 'default'} className="text-[9px] uppercase tracking-wider">{v.closed ? 'Closed' : 'Open'}</Badge>
                                      </div>
                                   </div>
                                ))
                             ) : (
                                <p className="text-xs font-bold text-gray-700 bg-gray-50 p-2 rounded-lg">{selectedReport.valveToBeIsolated || 'N/A'}</p>
                             )}
                          </div>
                       </div>
                       
                       {selectedReport.safetyNote && (
                         <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1 flex items-center"><AlertTriangle className="h-3 w-3 mr-1" /> Safety Note</p>
                           <p className="text-xs font-medium text-amber-800">{selectedReport.safetyNote}</p>
                         </div>
                       )}
                       
                       <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Job Specification</p>
                          <p className="text-xs font-medium text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                             {selectedReport.detailsOfJob}
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {selectedReport.approvalFormatUrl && (
                   <a 
                     href={selectedReport.approvalFormatUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-all group"
                   >
                     <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                        <Download className="h-5 w-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Approval Format</p>
                        <p className="text-xs font-bold text-blue-900">View Document</p>
                     </div>
                   </a>
                 )}
                 {selectedReport.checklistUrl && (
                   <a 
                     href={selectedReport.checklistUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all group"
                   >
                     <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-sm">
                        <Download className="h-5 w-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Safety Checklist</p>
                        <p className="text-xs font-bold text-emerald-900">View Document</p>
                     </div>
                   </a>
                 )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                 <div className="flex space-x-2">
                   <Button variant="ghost" onClick={() => exportPDF(selectedReport)} className="rounded-xl text-blue-600 hover:bg-blue-50">
                      <FileText className="h-4 w-4 mr-2" /> PDF Export
                   </Button>
                   <Button variant="ghost" onClick={() => toggleStatus(selectedReport)} className={cn(
                     "rounded-xl font-bold uppercase text-[10px] tracking-widest",
                     selectedReport.status === 'Active' ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"
                   )}>
                      {selectedReport.status === 'Active' ? 'Mark as Cleared' : 'Re-open Isolation'}
                   </Button>
                 </div>
                 <div className="flex space-x-3">
                    <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="rounded-xl">Close View</Button>
                     <Button onClick={() => {
                      const updatedFormData: Partial<IsolationReport> = {
                         ...selectedReport,
                         valves: selectedReport.valves?.length 
                            ? selectedReport.valves 
                            : (selectedReport.valveToBeIsolated ? [{ id: Math.random().toString(36).substring(2, 9), tagName: selectedReport.valveToBeIsolated, status: 'Good', closed: true, opened: selectedReport.status === 'Closed' }] : [])
                      };
                      setFormData(updatedFormData);
                      setIsViewModalOpen(false);
                      setIsAddModalOpen(true);
                    }} className="rounded-xl bg-gray-900 hover:bg-black">Edit Record</Button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>

      <Dialog 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        title=""
        maxWidth="max-w-md"
        className="bg-gray-900 border border-gray-800"
      >
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <Trash2 className="h-8 w-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white tracking-tight">Confirm Deletion</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">
              Are you sure you want to move this report to the Recycle Bin?
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setReportToDelete(null);
              }}
              className="w-full sm:w-auto rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Move to Recycle Bin
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
