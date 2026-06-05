import * as React from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  Building2, 
  ChevronRight, 
  Bell, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Droplets,
  Disc,
  Filter,
  ArrowRight,
  PieChart as PieChartIcon,
  Plus,
  Settings as SettingsIcon,
  Activity,
  Calendar,
  ShieldCheck,
  Zap,
  Search,
  LayoutGrid,
  Grid,
  ChevronLeft,
  FileCheck,
  Download,
  Edit3,
  History as HistoryIcon
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plant, TestRecord, SystemCategory, SubSystem, MaintenanceCycle, ScheduleMonth, TestingStatus, FinancialYear } from '../types';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { EquipmentHistoryModal } from '../components/shared/EquipmentHistoryModal';
import { EquipmentManageModal } from '../components/shared/EquipmentManageModal';
import { Dialog } from '../components/ui/Dialog';
import { AdminDeleteGateModal } from '../components/shared/AdminDeleteGateModal';
import { 
  FileSpreadsheet, 
  RefreshCw,
  LayoutDashboard,
  Trash2
} from 'lucide-react';
import { updateDocument, createDocument, deleteDocument } from '../services/firestoreService';
import { useGlobalStore } from '../store/useGlobalStore';

interface SystemCalendarProps {
  records: TestRecord[];
  onDateClick: (records: TestRecord[]) => void;
}

const SystemCalendar = ({ records, onDateClick }: SystemCalendarProps) => {
  const theme = useGlobalStore(state => state.theme);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getDayRecords = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.filter(r => (r.testDate || r.dateOfTesting) === dateStr);
  };

  return (
    <div className={cn("rounded-2xl border shadow-sm overflow-hidden", theme === 'modern' ? "bg-slate-900/40 backdrop-blur-xl border-slate-800/50" : "bg-white border-gray-100")}>
      <div className={cn("flex items-center justify-between p-6 border-b", theme === 'modern' ? "border-slate-800/50" : "border-gray-50")}>
        <h2 className={cn("text-xl font-black tracking-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{monthName} {year}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} className={cn("h-10 w-10", theme === 'modern' ? "text-slate-300 hover:bg-slate-800" : "")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className={cn("h-10 w-10", theme === 'modern' ? "text-slate-300 hover:bg-slate-800" : "")}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-7 mb-4 px-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={cn("text-center text-[10px] font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((day, idx) => {
            if (day === null) return <div key={`spacer-${idx}`} className={cn("aspect-square rounded-xl", theme === 'modern' ? "bg-slate-800/30" : "bg-gray-50/30")} />;
            const dayRecords = getDayRecords(day);
            const hasRecs = dayRecords.length > 0;
            return (
              <button
                key={day}
                onClick={() => hasRecs && onDateClick(dayRecords)}
                className={cn(
                  "aspect-square p-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1",
                  theme === 'modern' 
                    ? (hasRecs ? "bg-slate-800/60 border-[#D4AF37]/40 hover:border-[#D4AF37] hover:shadow-[0_0_10px_rgba(212,175,55,0.2)] active:scale-95" : "bg-slate-900/20 border-slate-800 text-slate-600")
                    : (hasRecs ? "bg-white border-[#C09532]/20 hover:border-[#C09532] hover:shadow-md active:scale-95" : "bg-white border-gray-50 text-gray-300")
                )}
              >
                <span className={cn("text-xs md:text-sm font-bold", theme === 'modern' ? (hasRecs ? "text-slate-200" : "text-slate-600") : (hasRecs ? "text-gray-900" : "text-gray-300"))}>{day}</span>
                {hasRecs && (
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {dayRecords.slice(0, 3).map((r) => (
                      <div key={r.id} className={cn("w-1.5 h-1.5 rounded-full",
                        r.status === 'Approved & Locked' ? 'bg-green-500' :
                        r.status === 'Unsatisfactory' ? 'bg-red-500' : 'bg-amber-500'
                      )} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};



export default function PlantSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useGlobalStore(state => state.theme);
  const liveRecords = useGlobalStore(state => state.records);
  const categories = useGlobalStore(state => state.categories);
  const subSystems = useGlobalStore(state => state.subSystems);
  const plants = useGlobalStore(state => state.plants);
  const loading = useGlobalStore(state => state.loading);
  const currentYear = localStorage.getItem('fy') || '2026-27';
  
  const [userRole, setUserRole] = React.useState<'Technician' | 'Admin'>('Technician');
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');
  const [selectedDateRecords, setSelectedDateRecords] = React.useState<TestRecord[] | null>(null);
  const [selectedPlantTests, setSelectedPlantTests] = React.useState<{plant: Plant, records: TestRecord[]} | null>(null);
  const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);
  const [tableFilters, setTableFilters] = React.useState({ plantName: '', systemDetail: '', frequency: '', month: '', date: '', status: '' });
  
  const [monthFilter, setMonthFilter] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('');
  const [testerFilter, setTesterFilter] = React.useState('');

  const [editingRecord, setEditingRecord] = React.useState<TestRecord | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = React.useState(false);
  const [deleteGate, setDeleteGate] = React.useState<{ isOpen: boolean; record: TestRecord } | null>(null);

  React.useEffect(() => {
    if (location.state && location.state.selectedCatId) setSelectedCatId(location.state.selectedCatId);
  }, [location.state]);

  const filteredRecords = (liveRecords || []).filter(r => {
    const matchesYear = r.financialYear === currentYear || !r.financialYear; // Some live records may not have a year
    const matchesCategory = !selectedCatId || r.categoryId === selectedCatId;
    const categoryExists = !r.categoryId || categories.some(cat => cat.id === r.categoryId);
    const subSystemExists = !r.subSystemId || subSystems.some(sub => sub.id === r.subSystemId);
    const matchesTablePlant = !tableFilters.plantName || (r.plantName || '').toLowerCase().includes((tableFilters.plantName || '').toLowerCase());
    const matchesTableSystem = !tableFilters.systemDetail || (r.tagNumber || '').toLowerCase().includes((tableFilters.systemDetail || '').toLowerCase()) || (r.subSystemName || '').toLowerCase().includes((tableFilters.systemDetail || '').toLowerCase());
    const matchesTableStatus = !tableFilters.status || (r.status || '').toLowerCase().includes((tableFilters.status || '').toLowerCase());
    
    // UI Upgrade Filters
    const matchesMonth = monthFilter === '' || String(r.scheduleMonth || r.testDate || r.dateOfTesting || '').toLowerCase().includes((monthFilter || '').toLowerCase());
    const matchesDate = dateFilter === '' || String(r.testDate || r.dateOfTesting || '').toLowerCase().includes((dateFilter || '').toLowerCase());
    const matchesTester = testerFilter === '' || String(r.testerName || 'unassigned').toLowerCase().includes((testerFilter || '').toLowerCase());

    return matchesYear && matchesCategory && categoryExists && subSystemExists && matchesTablePlant && matchesTableSystem && matchesTableStatus && matchesMonth && matchesDate && matchesTester;
  });

  const handleApproveRecord = async (record: TestRecord) => {
    if (userRole !== 'Admin') return;
    const tId = toast.loading('Approving...');
    try {
      await updateDocument('TEST_RECORDS', record.id, { ...record, status: 'Approved & Locked', updatedAt: new Date().toISOString() });
      toast.success('Approved!', { id: tId });
    } catch (err: any) { toast.error(err.message, { id: tId }); }
  };

  const performSafeDelete = async (record: TestRecord) => {
    try {
      // Create it in recycle bin
      await createDocument('RECYCLE_BIN', {
        ...record,
        deletedAt: new Date().toISOString(),
        originalCollection: 'TEST_RECORDS'
      });
      // Delete from test records
      await deleteDocument('TEST_RECORDS', record.id);
    } catch (err: any) {
      toast.error('Failed to move to recycle bin: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-[#C09532] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-6">
        <div>
          <h1 className={cn("text-3xl font-black mb-1 tracking-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>Planning & Schedule</h1>
          <p className={cn("text-sm font-medium", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>Coordinate maintenance cycles & facility mapping across industrial units</p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Button key={cat.id} variant={selectedCatId === cat.id ? 'primary' : 'outline'} size="sm" onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)} className={cn("rounded-full text-[10px] font-black uppercase tracking-widest", selectedCatId === cat.id ? (theme === 'modern' ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]" : "bg-[#C09532] border-[#C09532] text-white") : (theme === 'modern' ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-900"))}>{cat.name}</Button>
            ))}
          </div>
        </div>
      </div>

      <Card className={cn("overflow-hidden border-none shadow-sm", theme === 'modern' ? "bg-slate-900/40 backdrop-blur-xl border border-slate-800/50" : "bg-white")}>
        <CardHeader className={cn("flex flex-col sm:flex-row sm:items-center justify-between border-b p-6 gap-4", theme === 'modern' ? "border-slate-800/50" : "border-gray-100")}>
          <div className="flex items-center space-x-3">
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", theme === 'modern' ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-[#C09532]/10 text-[#C09532]")}>
               {viewMode === 'list' ? <Grid className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            </div>
            <div>
               <CardTitle className={cn("text-lg font-black uppercase tracking-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
                  {viewMode === 'list' ? 'Master Schedule View' : 'Temporal Schedule'}
               </CardTitle>
               <p className={cn("text-[10px] font-medium uppercase tracking-widest", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>Active filtered data context</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className={cn("uppercase text-[10px] font-black tracking-[0.2em] border-b", theme === 'modern' ? "bg-slate-900/60 text-[#D4AF37] border-slate-700/50" : "bg-gray-50 text-gray-400 border-gray-100")}>
                    <th className="px-6 py-5">Plant Name</th>
                    <th className="px-6 py-5">System Detail</th>
                    <th className="px-6 py-5">Cycle</th>
                    <th className="px-6 py-5">SCHEDULE MONTH</th>
                    <th className="px-6 py-5">DATE OF TESTING</th>
                    <th className="px-6 py-5">TESTER NAME</th>
                    <th className="px-6 py-5">Compliance</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                  <tr className={cn("border-b", theme === 'modern' ? "bg-slate-900/20 border-slate-700/50" : "bg-white border-gray-50")}>
                    <th className="px-4 py-2">
                       <input type="text" placeholder="Filter..." className={cn("w-full text-[10px] py-1 px-2 border rounded-lg outline-none", theme === 'modern' ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "border-gray-100 focus:border-blue-300")} value={tableFilters.plantName} onChange={e => setTableFilters({...tableFilters, plantName: e.target.value})} />
                    </th>
                    <th className="px-4 py-2">
                       <input type="text" placeholder="Filter..." className={cn("w-full text-[10px] py-1 px-2 border rounded-lg outline-none", theme === 'modern' ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "border-gray-100 focus:border-blue-300")} value={tableFilters.systemDetail} onChange={e => setTableFilters({...tableFilters, systemDetail: e.target.value})} />
                    </th>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2">
                       <input type="text" placeholder="Filter..." className={cn("w-full text-[10px] py-1 px-2 border rounded-lg outline-none", theme === 'modern' ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "border-gray-100 focus:border-blue-300")} value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
                    </th>
                    <th className="px-4 py-2">
                       <input type="text" placeholder="Filter..." className={cn("w-full text-[10px] py-1 px-2 border rounded-lg outline-none", theme === 'modern' ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "border-gray-100 focus:border-blue-300")} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                    </th>
                    <th className="px-4 py-2">
                       <input type="text" placeholder="Filter..." className={cn("w-full text-[10px] py-1 px-2 border rounded-lg outline-none", theme === 'modern' ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "border-gray-100 focus:border-blue-300")} value={testerFilter} onChange={e => setTesterFilter(e.target.value)} />
                    </th>
                    <th className="px-4 py-2">
                       <input type="text" placeholder="Filter..." className={cn("w-full text-[10px] py-1 px-2 border rounded-lg outline-none", theme === 'modern' ? "bg-slate-800/50 border-slate-700 text-slate-200 focus:border-[#D4AF37]" : "border-gray-100 focus:border-blue-300")} value={tableFilters.status} onChange={e => setTableFilters({...tableFilters, status: e.target.value})} />
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", theme === 'modern' ? "divide-slate-800/40 text-slate-300" : "divide-gray-50")}>
                  {filteredRecords.map(record => (
                    <tr 
                      key={record.id} 
                      className={cn("transition-colors group cursor-pointer", theme === 'modern' ? "hover:bg-slate-800/40" : "hover:bg-[#C09532]/5")} 
                      onClick={() => navigate(`/categories/${record.categoryId}/${record.subSystemId}/${record.plantId}`)}
                    >
                      <td className="px-6 py-5"><div className="flex items-center space-x-3"><Building2 className={cn("h-4 w-4", theme === 'modern' ? "text-slate-500" : "text-gray-400")} /><span className={cn("font-bold text-xs uppercase tracking-wider", theme === 'modern' ? "text-slate-200" : "text-gray-900")}>{record.plantName}</span></div></td>
                      <td className="px-6 py-5"><div className="flex flex-col"><span className={cn("font-black text-sm leading-tight", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{record.tagNumber}</span><span className={cn("text-[10px] font-bold uppercase mt-0.5", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>{record.subSystemName}</span></div></td>
                      <td className="px-6 py-5"><Badge variant="info" className={cn("text-[9px] font-black uppercase px-2 py-0.5 h-auto border-none", theme === 'modern' ? "bg-slate-800 text-slate-300" : "bg-[#C09532]/10 text-[#C09532]")}>{record.cycle}</Badge></td>
                      <td className="px-6 py-5"><span className={cn("text-[10px] font-bold uppercase", theme === 'modern' ? "text-slate-300" : "text-gray-700")}>{record.scheduleMonth || record.testDate || 'N/A'}</span></td>
                      <td className="px-6 py-5"><span className={cn("text-[10px] font-bold", theme === 'modern' ? "text-slate-300" : "text-gray-700")}>{record.testDate || record.dateOfTesting || 'Pending'}</span></td>
                      <td className="px-6 py-5">
                        {record.testerName ? (
                          <span className={cn("text-[10px] font-bold", theme === 'modern' ? "text-slate-300" : "text-gray-700")}>{record.testerName}</span>
                        ) : (
                          <span className={cn("text-[10px] font-bold italic px-2 py-0.5 rounded", theme === 'modern' ? "bg-slate-800 text-slate-500" : "bg-gray-50 text-gray-400")}>Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-5"><div className="flex items-center"><div className={cn("h-1.5 w-1.5 rounded-full mr-2", record.status === 'Approved & Locked' ? 'bg-emerald-500' : record.status === 'Unsatisfactory' ? 'bg-rose-500' : 'bg-amber-500')} /><span className={cn("text-[10px] font-black uppercase tracking-widest", record.status === 'Approved & Locked' ? 'text-emerald-600' : record.status === 'Unsatisfactory' ? 'text-rose-600' : 'text-amber-600')}>{record.status}</span></div></td>
                      <td className="px-6 py-5 text-right"><div className="flex items-center justify-end space-x-2">
                        {userRole === 'Admin' && record.status === 'Pending Review' && <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleApproveRecord(record); }} className="h-8 w-8 p-0 bg-green-50 text-green-600 rounded-lg"><FileCheck className="h-4 w-4" /></Button>}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-[10px] font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/categories/${record.categoryId}/${record.subSystemId}/${record.plantId}`);
                          }}
                        >
                          {userRole === 'Technician' && (record.status === 'Pending' || record.status === 'Overdue') ? 'Start Testing' : 'Review'}
                        </Button>
                        {userRole === 'Admin' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteGate({ isOpen: true, record });
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                          </Button>
                        )}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={cn("p-6", theme === 'modern' ? "bg-slate-900/60" : "bg-gray-50/50")}><SystemCalendar records={filteredRecords} onDateClick={recs => setSelectedDateRecords(recs)} /></div>
          )}
        </CardContent>
      </Card>

      <EquipmentHistoryModal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} record={editingRecord} onSave={() => { setEditingRecord(null); }} userRole={userRole} />
      <EquipmentManageModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} onSave={() => { setIsManageModalOpen(false); }} initialCategoryId={selectedCatId} />

      <Dialog isOpen={!!selectedDateRecords} onClose={() => setSelectedDateRecords(null)} title="Queue" maxWidth="max-w-xl">
        <div className="p-6 space-y-3">{selectedDateRecords?.map(r => (
          <div key={r.id} className={cn("p-4 rounded-xl border flex items-center justify-between", theme === 'modern' ? "bg-slate-900/40 border-slate-800" : "bg-white border-gray-100")}>
            <div>
              <p className={cn("text-[10px] font-black uppercase mb-1", theme === 'modern' ? "text-[#D4AF37]" : "text-[#C09532]")}>{r.plantName}</p>
              <p className={cn("text-sm font-bold", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{r.tagNumber} - {r.subSystemName}</p>
            </div>
            <Badge variant={r.status === 'Approved & Locked' ? 'success' : 'warning'} className={cn(theme === 'modern' ? "bg-slate-800 text-slate-300" : "")}>{r.status}</Badge>
          </div>
        ))}</div>
      </Dialog>

      <Dialog isOpen={!!selectedPlantTests} onClose={() => setSelectedPlantTests(null)} title={selectedPlantTests?.plant.name || 'Plant'} maxWidth="max-w-2xl">
        <div className="p-6 space-y-4">{selectedPlantTests?.records.map(r => (
          <div key={r.id} className={cn("p-4 rounded-xl border flex items-center justify-between", theme === 'modern' ? "bg-slate-900/40 border-slate-800" : "bg-white border-gray-100")}>
            <div>
              <p className={cn("text-xs font-black uppercase", theme === 'modern' ? "text-slate-500" : "text-gray-500")}>{r.cycle}</p>
              <p className={cn("text-sm font-bold", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>{r.subSystemName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={r.status === 'Approved & Locked' ? 'success' : 'warning'} className={cn(theme === 'modern' ? "bg-slate-800 text-slate-300" : "")}>{r.status}</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { 
                  setSelectedPlantTests(null); 
                  navigate(`/categories/${r.categoryId}/${r.subSystemId}/${r.plantId}`);
                }} 
                className={cn("font-bold text-xs uppercase", theme === 'modern' ? "text-slate-300 hover:bg-slate-800" : "text-[#C09532]")}
              >
                {userRole === 'Technician' && (r.status === 'Pending' || r.status === 'Overdue') ? 'Test' : 'Manage'}
              </Button>
            </div>
          </div>
        ))}</div>
      </Dialog>

      {deleteGate && (
        <AdminDeleteGateModal
          isOpen={deleteGate.isOpen}
          onClose={() => setDeleteGate(null)}
          onConfirm={() => performSafeDelete(deleteGate.record)}
          targetName={deleteGate.record.tagNumber || deleteGate.record.subSystemName || 'Record'}
          targetType="record"
        />
      )}
    </div>
  );
}
