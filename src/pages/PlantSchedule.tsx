import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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
  LayoutGrid
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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { dbApi } from '../db/storage';
import { Plant, TestRecord, SystemCategory, MaintenanceCycle, ScheduleMonth, TestingStatus, FinancialYear } from '../types';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { RecordEditModal } from '../components/shared/RecordEditModal';
import { EquipmentManageModal } from '../components/shared/EquipmentManageModal';
import { AdminAuthModal } from '../components/shared/AdminAuthModal';
import { Dialog } from '../components/ui/Dialog';
import { 
  FileSpreadsheet, 
  Download, 
  Trash2,
  TrendingUp,
  History,
  Archive,
  RefreshCw,
  LayoutDashboard
} from 'lucide-react';

export default function PlantSchedule() {
  const navigate = useNavigate();
  const [categories, setCategories] = React.useState<SystemCategory[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [currentYear, setCurrentYear] = React.useState<FinancialYear>('2024-25');
  const [viewType, setViewType] = React.useState<'quarterly' | 'semiannual'>('quarterly');
  
  const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = React.useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = React.useState<string | null>(null);
  
  // Search and Table Filtering State
  const [plantSearchTerm, setPlantSearchTerm] = React.useState('');
  const [tableFilters, setTableFilters] = React.useState({
    plantName: '',
    systemDetail: '',
    frequency: '',
    month: '',
    date: '',
    status: ''
  });
  
  const [editingRecord, setEditingRecord] = React.useState<TestRecord | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = React.useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = React.useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false);
  const [nextYear, setNextYear] = React.useState<FinancialYear | ''>('');

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [activeYear, allCats, allPlants, allRecords] = await Promise.all([
      dbApi.getActiveYear(),
      dbApi.getCategories(),
      dbApi.getPlants(),
      dbApi.getTestRecords()
    ]);
    setCurrentYear(activeYear);
    setCategories(allCats);
    setPlants(allPlants);
    setRecords(allRecords);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const getUpcomingTests = () => {
    // Logic for notifications: Pending or Overdue tests in the next/current schedule window
    return records
      .filter(r => r.status === 'Pending' || r.status === 'Overdue')
      .sort((a, b) => (a.scheduleMonth || '').localeCompare(b.scheduleMonth || ''))
      .slice(0, 5);
  };

  const filteredRecords = records.filter(r => {
    const matchesYear = r.financialYear === currentYear;
    const matchesCategory = !selectedCatId || r.categoryId === selectedCatId;
    const matchesPlant = !selectedPlantId || r.plantId === selectedPlantId;
    const matchesFreq = !selectedFrequency || r.cycle === selectedFrequency;
    
    // Direct Table Filters
    const matchesTablePlant = !tableFilters.plantName || r.plantName.toLowerCase().includes(tableFilters.plantName.toLowerCase());
    const matchesTableSystem = !tableFilters.systemDetail || r.tagNumber.toLowerCase().includes(tableFilters.systemDetail.toLowerCase()) || r.subSystemName.toLowerCase().includes(tableFilters.systemDetail.toLowerCase());
    const matchesTableFreq = !tableFilters.frequency || r.cycle.toLowerCase().includes(tableFilters.frequency.toLowerCase());
    const matchesTableMonth = !tableFilters.month || (r.scheduleMonth || '').toLowerCase().includes(tableFilters.month.toLowerCase());
    const matchesTableDate = !tableFilters.date || (r.dateOfTesting || '').toLowerCase().includes(tableFilters.date.toLowerCase());
    const matchesTableStatus = !tableFilters.status || r.status.toLowerCase().includes(tableFilters.status.toLowerCase());
    
    return matchesYear && matchesCategory && matchesPlant && matchesFreq && matchesTablePlant && matchesTableSystem && matchesTableFreq && matchesTableMonth && matchesTableDate && matchesTableStatus;
  });

  const yearRecords = records.filter(r => r.financialYear === currentYear);

  const filteredPlants = plants.filter(p => 
    p.name.toLowerCase().includes(plantSearchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(plantSearchTerm.toLowerCase())
  );

  const getStatusColor = (status: TestingStatus) => {
    switch (status) {
      case 'Completed': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Overdue': return '#EF4444';
      case 'Due Soon': return '#3B82F6';
      default: return '#94A3B8';
    }
  };

  const stats = React.useMemo(() => {
    const total = yearRecords.length || 1;
    const completed = yearRecords.filter(r => r.status === 'Completed').length;
    const pending = yearRecords.filter(r => r.status === 'Pending' || r.status === 'Due Soon').length;
    const overdue = yearRecords.filter(r => r.status === 'Overdue').length;
    
    return [
      { name: 'Completed', value: completed, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Overdue', value: overdue, color: '#EF4444' },
    ];
  }, [yearRecords]);

  const completionRate = Math.round((yearRecords.filter(r => r.status === 'Completed').length / (yearRecords.length || 1)) * 100);

  const monthlyCounts = React.useMemo(() => {
    const months: ScheduleMonth[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.map(m => ({
      name: m.slice(0, 3),
      count: yearRecords.filter(r => r.scheduleMonth === m).length
    }));
  }, [yearRecords]);

  // Analytics View Data (from Overall Dashboard)
  const timeSeriesData = React.useMemo(() => {
    if (viewType === 'quarterly') {
      return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
        name: q,
        completed: yearRecords.filter(r => r.cycle === q && r.status === 'Completed').length,
        total: yearRecords.filter(r => r.cycle === q).length
      }));
    } else {
      return [
        { 
          name: '1st Semiannual', 
          completed: yearRecords.filter(r => (r.cycle === 'Q1' || r.cycle === 'Q2' || r.cycle === 'First Semiannual') && r.status === 'Completed').length,
          total: yearRecords.filter(r => (r.cycle === 'Q1' || r.cycle === 'Q2' || r.cycle === 'First Semiannual')).length
        },
        { 
          name: '2nd Semiannual', 
          completed: yearRecords.filter(r => (r.cycle === 'Q3' || r.cycle === 'Q4' || r.cycle === 'Second Semiannual') && r.status === 'Completed').length,
          total: yearRecords.filter(r => (r.cycle === 'Q3' || r.cycle === 'Q4' || r.cycle === 'Second Semiannual')).length
        }
      ];
    }
  }, [yearRecords, viewType]);

  const foamData = plants.map(p => {
    const foamRecords = yearRecords.filter(r => r.plantId === p.id && r.categoryName === 'Foam System');
    return {
      name: p.code,
      satisfactory: foamRecords.filter(r => r.healthCondition === 'Satisfactory').length,
      unsatisfactory: foamRecords.filter(r => r.healthCondition === 'Unsatisfactory').length
    };
  }).slice(0, 8);

  const plantCycleData = plants.map(p => {
    const plantRecords = yearRecords.filter(r => r.plantId === p.id);
    return {
      name: p.code,
      quarterly: plantRecords.filter(r => r.cycle.startsWith('Q')).length,
      semiannual: plantRecords.filter(r => r.cycle.includes('Semiannual')).length,
      annual: plantRecords.filter(r => r.cycle === 'Annual').length,
      other: plantRecords.filter(r => !r.cycle.startsWith('Q') && !r.cycle.includes('Semiannual') && r.cycle !== 'Annual').length
    };
  }).slice(0, 10);

  const scheduleStats = React.useMemo(() => [
    { label: 'Tracked Systems', val: yearRecords.length, icon: Activity, color: 'blue' },
    { label: 'Perfect Compliance', val: `${completionRate}%`, icon: ShieldCheck, color: 'emerald' },
    { label: 'Upcoming (30d)', val: yearRecords.filter(r => r.status === 'Pending' || r.status === 'Due Soon').length, icon: Calendar, color: 'indigo' },
    { label: 'Critical Action', val: yearRecords.filter(r => r.status === 'Overdue').length, icon: AlertTriangle, color: 'rose' },
  ], [yearRecords, completionRate]);

  const categoryBoxes = [
    { name: 'Fixed System', icon: Flame, color: 'bg-red-50 text-red-600 border-red-100' },
    { name: 'Foam System', icon: Droplets, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { name: 'Sprinkler System', icon: Droplets, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { name: 'Rim Seal Protection', icon: Disc, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ];

  const handleExportByFolder = () => {
    const dataByFolder: any[] = [];
    
    categories.forEach(cat => {
      const catRecords = yearRecords.filter(r => r.categoryId === cat.id);
      catRecords.forEach(r => {
        dataByFolder.push({
          'Financial Year': r.financialYear,
          'System Category': r.categoryName,
          'Sub-System Folder': r.subSystemName,
          'Plant Code': r.plantId,
          'Plant Name': r.plantName,
          'Tag Number': r.tagNumber,
          'Cycle': r.cycle,
          'Schedule Month': r.scheduleMonth,
          'Testing Status': r.status,
          'Date of Testing': r.dateOfTesting,
          'Health Condition': r.healthCondition,
          'Deficiency': r.deficiency,
          'Action Taken': r.actionTaken,
          'Tested By': r.testedBy
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(dataByFolder);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Schedule " + currentYear);
    XLSX.writeFile(wb, `FPS_Master_Export_${currentYear}.xlsx`);
  };

  const handleConfirmNewCycle = async () => {
    if (!nextYear) return;
    await dbApi.startNewCycle(nextYear as FinancialYear);
    setIsCycleModalOpen(false);
    // loadData is handled by fy-change listener
  };

  const handleStartNewCycle = () => {
    if (!nextYear) return;
    setIsAdminAuthOpen(true);
  };

  const handleBoxClick = (name: string) => {
    const cat = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (cat) setSelectedCatId(cat.id === selectedCatId ? null : cat.id);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner with Cycle Select */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm px-6">
         <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
               <History className="h-5 w-5" />
            </div>
            <div>
               <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Global Status Summary</h4>
               <p className="mt-1 text-lg font-black text-blue-600">Active Cycle: {currentYear}</p>
            </div>
         </div>
         <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={handleExportByFolder} className="rounded-xl border-gray-200 text-gray-600 font-bold">
               <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
               Export All Folders
            </Button>
            <Button size="sm" onClick={() => setIsCycleModalOpen(true)} className="bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200">
               <RefreshCw className="h-4 w-4 mr-2" />
               Start New Cycle
            </Button>
         </div>
      </div>

      {/* Front Dashboard Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scheduleStats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all overflow-hidden group h-full">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-gray-900 leading-none">{stat.val}</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300",
                    stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                    stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                    stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                  )}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="lg:col-span-4 border-none shadow-sm p-6 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Monthly Load</h3>
            <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCounts}>
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <XAxis dataKey="name" hide />
                <RechartsTooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 font-bold text-center mt-2 uppercase tracking-tighter">Tests Distributed Across Financial Year</p>
        </Card>
      </div>

      {/* Header & Notifications */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">System Testing Master Schedule</h1>
            <p className="text-gray-500 font-medium">Auto-calculated maintenance cycles & compliance tracking</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Q1', 'Q2', 'Q3', 'Q4', 'First Semiannual', 'Second Semiannual', 'Annual'].map(freq => (
              <Button
                key={freq}
                variant={selectedFrequency === freq ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedFrequency(selectedFrequency === freq ? null : freq)}
                className={cn(
                  "rounded-full text-[10px] font-black uppercase tracking-widest",
                   selectedFrequency === freq ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200 text-gray-400"
                )}
              >
                {freq}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Progress Circle & Notifications */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Card className="w-full sm:w-48 bg-white border-none shadow-sm flex flex-col items-center justify-center p-4">
            <div className="h-24 w-24 relative mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats}
                    innerRadius={30}
                    outerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-gray-900 leading-none">{completionRate}%</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Q2 Completion</p>
          </Card>

          <div className="w-full lg:w-96 bg-gray-900 rounded-3xl p-5 flex items-start space-x-4 shadow-xl border border-gray-800">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Live Compliance Feed</span>
                <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-none animate-pulse text-[9px]">Synced</Badge>
              </div>
              <div className="space-y-2">
                {getUpcomingTests().length > 0 ? getUpcomingTests().map(test => (
                   <div key={test.id} className="group flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer">
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{test.tagNumber}</p>
                        <p className="text-[9px] text-gray-500 truncate">{test.plantName}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                         <p className="text-[10px] font-bold text-blue-400">{test.scheduleMonth}</p>
                         <p className="text-[8px] text-gray-600 uppercase font-black">{test.cycle}</p>
                      </div>
                   </div>
                )) : (
                  <p className="text-xs text-gray-500 italic">No critical testing alerts found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Series Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryBoxes.map((box, idx) => {
          const matchingCat = categories.find(c => c.name.toLowerCase() === box.name.toLowerCase());
          const isActive = matchingCat && matchingCat.id === selectedCatId;
          
          return (
            <motion.button
              key={box.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => handleBoxClick(box.name)}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center space-y-3 outline-none",
                isActive 
                  ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100 ring-4 ring-blue-600/10" 
                  : cn("bg-white hover:shadow-md", box.color.split(' ')[2])
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl transition-colors",
                isActive ? "bg-white/20 text-white" : box.color.split(' ').slice(0, 2).join(' ')
              )}>
                <box.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className={cn("font-bold tracking-tight", isActive ? "text-white" : "text-gray-900")}>{box.name}</h3>
                <p className={cn("text-[10px] uppercase font-black tracking-widest mt-1", isActive ? "text-blue-100" : "text-gray-400")}>
                  {matchingCat ? `${yearRecords.filter(r => r.categoryId === matchingCat.id).length} units tracked` : 'System category not initialized'}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Analytics Bento Additions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <Card className="lg:col-span-7 border-none shadow-sm h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
               <div className="flex items-center space-x-2">
                 <TrendingUp className="h-5 w-5 text-indigo-500" />
                 <CardTitle className="text-gray-900 font-black uppercase text-xs tracking-widest">Cycle Analytics Detail</CardTitle>
               </div>
               <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewType('quarterly')}
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all", viewType === 'quarterly' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
                >
                  Quarter
                </button>
                <button 
                  onClick={() => setViewType('semiannual')}
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all", viewType === 'semiannual' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
                >
                  Semi
                </button>
              </div>
            </CardHeader>
            <CardContent className="h-full">
               <ResponsiveContainer width="100%" height="75%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorTotalU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 10}} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#3B82F6" fillOpacity={1} fill="url(#colorTotalU)" name="Scheduled" />
                    <Area type="monotone" dataKey="completed" stroke="#10B981" fillOpacity={0} name="Executed" strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>

         <Card className="lg:col-span-5 border-none shadow-sm h-[400px]">
            <CardHeader>
                 <div className="flex items-center space-x-2">
                   <LayoutGrid className="h-5 w-5 text-blue-500" />
                   <CardTitle className="text-gray-900 font-black uppercase text-xs tracking-widest">Plant vs System Periods</CardTitle>
                 </div>
            </CardHeader>
            <CardContent className="h-full">
               <ResponsiveContainer width="100%" height="75%">
                  <BarChart data={plantCycleData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 10}} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 10}} width={40} />
                    <RechartsTooltip cursor={{fill: '#F8FAFC'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold'}} />
                    <Bar dataKey="quarterly" stackId="a" fill="#3B82F6" name="Quarterly" />
                    <Bar dataKey="semiannual" stackId="a" fill="#8B5CF6" name="Semi-Annual" />
                    <Bar dataKey="annual" stackId="a" fill="#10B981" name="Annual" />
                    <Bar dataKey="other" stackId="a" fill="#F59E0B" name="Other" />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>
      </div>

      {/* Plant Selection & Schedule Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Plant List (Left) */}
        <div className="xl:col-span-3 space-y-4">
           <div className="flex items-center justify-between px-2">
             <h2 className="font-bold text-gray-900 flex items-center">
               <Building2 className="h-4 w-4 mr-2" />
               Select Facility
             </h2>
             <Button variant="ghost" size="sm" onClick={() => {
               setSelectedPlantId(null);
               setPlantSearchTerm('');
             }} className="text-xs text-gray-400 h-6">Clear</Button>
           </div>
           
             <div className="relative px-2">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
               <input 
                 type="text"
                 placeholder="FILTOR"
                 className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-300"
                 value={plantSearchTerm}
                 onChange={(e) => setPlantSearchTerm(e.target.value)}
               />
             </div>

           <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
             {filteredPlants.map(p => (
               <button
                 key={p.id}
                 onClick={() => setSelectedPlantId(p.id === selectedPlantId ? null : p.id)}
                 className={cn(
                   "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                   selectedPlantId === p.id
                    ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/10"
                    : "bg-white border-gray-100 hover:border-gray-200"
                 )}
               >
                 <div className="flex items-center space-x-3">
                   <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold", selectedPlantId === p.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500")}>
                     {p.code}
                   </div>
                   <span className={cn("text-sm font-medium text-left truncate max-w-[120px]", selectedPlantId === p.id ? "text-blue-600 font-bold" : "text-gray-700")}>{p.name}</span>
                 </div>
                 {selectedPlantId === p.id && <ArrowRight className="h-4 w-4 text-blue-500" />}
               </button>
             ))}
           </div>
        </div>

        {/* Schedule Table (Right) */}
        <div className="xl:col-span-9 space-y-6">
           <Card className="overflow-hidden flex flex-col border-none shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 bg-white p-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                   <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-gray-900">Timeline Strategy</CardTitle>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Master Testing Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 mr-4">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                        {i}
                     </div>
                   ))}
                </div>
                <Button onClick={() => setIsManageModalOpen(true)} className="bg-gray-900 hover:bg-black text-white rounded-2xl px-6 font-bold shadow-lg shadow-gray-200 transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  Map System to Plant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-gray-100">
                    <th className="px-6 py-5">Plant Name</th>
                    <th className="px-6 py-5">System Detail</th>
                    <th className="px-6 py-5">Frequency Badge</th>
                    <th className="px-6 py-5">SCHEDULE MONTH</th>
                    <th className="px-6 py-5">Date of Testing</th>
                    <th className="px-6 py-5">Compliance Status</th>
                    <th className="px-6 py-5 text-right">Operations</th>
                  </tr>
                  {/* Inline Filter Row */}
                  <tr className="bg-white border-b border-gray-50">
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300"
                        value={tableFilters.plantName}
                        onChange={(e) => setTableFilters({...tableFilters, plantName: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300"
                        value={tableFilters.systemDetail}
                        onChange={(e) => setTableFilters({...tableFilters, systemDetail: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300"
                        value={tableFilters.frequency}
                        onChange={(e) => setTableFilters({...tableFilters, frequency: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300"
                        value={tableFilters.month}
                        onChange={(e) => setTableFilters({...tableFilters, month: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300"
                        value={tableFilters.date}
                        onChange={(e) => setTableFilters({...tableFilters, date: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="FILTOR" 
                        className="w-full text-[10px] py-1 px-2 border border-gray-100 rounded-lg font-medium text-gray-600 focus:ring-1 focus:ring-blue-500/10 placeholder:text-gray-300"
                        value={tableFilters.status}
                        onChange={(e) => setTableFilters({...tableFilters, status: e.target.value})}
                      />
                    </th>
                    <th className="px-4 py-2">
                      <div className="w-full text-[10px] text-center font-bold text-gray-300 uppercase">FILTOR</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/categories/${record.categoryId}/${record.subSystemId}/${record.plantId}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                          <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">{record.plantName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0",
                            record.categoryName.includes('Foam') ? 'bg-blue-50 text-blue-600' :
                            record.categoryName.includes('Fixed') ? 'bg-red-50 text-red-600' :
                            record.categoryName.includes('Sprinkler') ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                          )}>
                             <Activity className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 text-sm leading-tight tracking-tight">{record.tagNumber}</span>
                            <span className="text-[10px] text-gray-400 flex items-center mt-1 uppercase font-bold">
                              {record.subSystemName} 
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge variant="info" className="text-[10px] font-black uppercase tracking-widest px-2 py-1 h-auto bg-blue-50 text-blue-600 border-none">
                           {record.cycle} 
                         </Badge>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-[10px] font-bold text-gray-700 uppercase">
                           {record.cycle.includes('Semiannual') ? (record.cycle.includes('First') ? 'APRIL - SEP' : 'OCT - MAR') : record.scheduleMonth}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs font-medium text-gray-500">
                          <Calendar className="h-3 w-3 mr-2 text-gray-300" />
                          {record.dateOfTesting || 'Pending'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={cn("h-2 w-2 rounded-full mr-2 animate-pulse", 
                            record.status === 'Completed' ? 'bg-emerald-500' : 
                            record.status === 'Overdue' ? 'bg-rose-500' : 'bg-amber-500'
                          )} />
                          <span className={cn("text-[11px] font-black uppercase tracking-widest",
                            record.status === 'Completed' ? 'text-emerald-600' : 
                            record.status === 'Overdue' ? 'text-rose-600' : 'text-amber-600'
                          )}>{record.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRecord(record);
                            }}
                          >
                             <SettingsIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-gray-50 text-gray-600 invisible group-hover:visible hover:bg-gray-900 hover:text-white rounded-xl font-bold text-xs"
                          >
                             Review Target
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-32 text-center">
                         <div className="flex flex-col items-center justify-center text-gray-300">
                            <div className="h-16 w-16 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6">
                              <Filter className="h-8 w-8 opacity-20" />
                            </div>
                            <p className="font-black text-gray-900 text-lg tracking-tight">System Filter Context Needed</p>
                            <p className="text-xs uppercase tracking-[0.2em] mt-2 opacity-60 font-bold">Adjust category frequency or select specific facility</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEditModal 
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={() => {
          loadData();
          setEditingRecord(null);
        }}
      />

      <AdminAuthModal 
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onConfirm={handleConfirmNewCycle}
        actionTitle={`Initialize ${nextYear} Cycle`}
      />

      <Dialog isOpen={isCycleModalOpen} onClose={() => setIsCycleModalOpen(false)} title="Initialize New Financial Year">
          <div className="space-y-6">
             <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-1" />
                <div>
                   <p className="font-black uppercase text-[10px] tracking-widest mb-1">Warning: Master Migration</p>
                   <p className="text-xs leading-relaxed opacity-80">This will clone ALL existing master schedules into the new year as 'Pending'. Use this only when transitioning to a new audit period (e.g. from FY 2024-25 to 2026-27).</p>
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Target Year</label>
                <select 
                  className="w-full h-12 rounded-xl border border-gray-200 px-4 font-black text-blue-600"
                  value={nextYear}
                  onChange={(e) => setNextYear(e.target.value as FinancialYear)}
                >
                  <option value="">Choose Target Cycle...</option>
                  {['2025-26', '2026-27', '2027-28', '2028-29', '2029-30'].map(y => <option key={y} value={y}>FY {y}</option>)}
                </select>
             </div>

             <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsCycleModalOpen(false)}>Abort</Button>
                <Button className="flex-1 bg-gray-900 font-bold" disabled={!nextYear} onClick={handleStartNewCycle}>Execute Migration</Button>
             </div>
          </div>
      </Dialog>

      <EquipmentManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onSave={() => {
          loadData();
          setIsManageModalOpen(false);
        }}
      />
    </div>
  );
}
