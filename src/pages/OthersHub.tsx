import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  AlertTriangle, 
  HeartOff, 
  ArrowRight,
  ShieldCheck,
  Activity,
  History,
  LayoutGrid,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { dbApi } from '../db/storage';
import { motion } from 'motion/react';
import { FinancialYear } from '../types';
import { useGlobalStore } from '../store/useGlobalStore';
import { cn } from '../lib/utils';

export default function OthersHub() {
  const navigate = useNavigate();
  const { theme } = useGlobalStore();
  const [activeYear, setActiveYear] = React.useState<FinancialYear>('2024-25');
  
  // Real-time stats for the hub
  const [stats, setStats] = React.useState({
    isolationActive: 0,
    equipmentOpen: 0,
    unsatisfactoryCount: 0
  });

  const loadStats = React.useCallback(async () => {
    await dbApi.init();
    const [year, isolationReports, equipmentIssues, testRecords] = await Promise.all([
      dbApi.getActiveYear(),
      dbApi.getIsolationReports(),
      dbApi.getEquipmentIssues(),
      dbApi.getTestRecords()
    ]);
    setActiveYear(year);
    
    const isolation = isolationReports.filter(r => r.status === 'Active').length;
    const issues = equipmentIssues.filter(i => i.status === 'Open').length;
    const unsatisfactory = testRecords.filter(r => r.healthCondition === 'Unsatisfactory' && r.financialYear === year).length;
    
    setStats({
      isolationActive: isolation,
      equipmentOpen: issues,
      unsatisfactoryCount: unsatisfactory
    });
  }, []);

  React.useEffect(() => {
    loadStats();
    window.addEventListener('fy-change', loadStats);
    return () => window.removeEventListener('fy-change', loadStats);
  }, [loadStats]);

  const hubOptions = [
    {
      title: 'Isolation Reports',
      description: 'Manage plant isolations, safety permits, and job tracking records.',
      icon: ShieldAlert,
      path: '/others/isolation',
      color: 'blue',
      stat: `${stats.isolationActive} Active`,
      statColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Equipment Issues',
      description: 'Log and track faulty equipment, assign officers, and monitor resolutions.',
      icon: AlertTriangle,
      path: '/others/issues',
      color: 'red',
      stat: `${stats.equipmentOpen} Open`,
      statColor: 'text-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500'
    },
    {
      title: 'Unsatisfactory Systems',
      description: 'Critical portfolio of all assets failing health condition audits.',
      icon: HeartOff,
      path: '/others/unsatisfactory',
      color: 'rose',
      stat: `${stats.unsatisfactoryCount} Critical`,
      statColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-500'
    },
    {
      title: 'Master Asset Manager',
      description: 'Global source-of-truth inventory for all solid plants and physical locations.',
      icon: Building2,
      path: '/others/master-assets',
      color: 'purple',
      stat: `Assets`,
      statColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Recycle Bin',
      description: 'Review and restore deleted test records.',
      icon: Trash2,
      path: '/others/recycle-bin',
      color: 'orange',
      stat: `Archived`,
      statColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-10 pb-12 overflow-hidden">
      <div className="relative">
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full" />
        <div className="absolute -right-10 top-20 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full" />
        
        <div className="relative z-10">
          <h1 className={cn("text-3xl md:text-4xl font-black tracking-tight flex flex-col md:flex-row md:items-center gap-2 md:gap-4", theme === 'modern' ? "text-slate-100" : "text-gray-900")}>
            UTILITY HUB
            <span className={cn("w-fit px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border", theme === 'modern' ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-gray-100 text-gray-400 border-gray-200")}>
              FY {activeYear} Context
            </span>
          </h1>
          <p className={cn("font-medium mt-2 max-w-2xl text-sm md:text-base", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
            Centralized terminal for specialized operations, maintenance audits, and safety governance modules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
        {hubOptions.map((option, idx) => (
          <motion.div
            key={option.path}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Card 
              className={cn("border-none shadow-sm hover:shadow-2xl transition-all duration-500 group cursor-pointer overflow-hidden h-full", theme === 'modern' ? "bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 shadow-lg hover:shadow-black/50" : "bg-white hover:shadow-gray-200/50")}
              onClick={() => navigate(option.path)}
            >
              <div className={cn("h-2 w-full", `bg-${option.color}-500`)} />
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className={cn("h-16 w-16 rounded-[2rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110", theme === 'modern' ? `bg-${option.color}-500/10` : option.bgColor, option.iconColor)}>
                    <option.icon className="h-8 w-8" />
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>Status</p>
                    <span className={cn("text-lg font-black", option.statColor)}>{option.stat}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className={cn("text-xl font-black tracking-tight transition-colors", theme === 'modern' ? "text-slate-200 group-hover:text-blue-400" : "text-gray-900 group-hover:text-blue-600")}>
                    {option.title}
                  </h3>
                  <p className={cn("text-sm font-medium leading-relaxed", theme === 'modern' ? "text-slate-400" : "text-gray-500")}>
                    {option.description}
                  </p>
                </div>

                <div className={cn("mt-8 pt-6 border-t flex items-center justify-between", theme === 'modern' ? "border-slate-800" : "border-gray-50")}>
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] transition-colors", theme === 'modern' ? "text-slate-600 group-hover:text-blue-400" : "text-gray-300 group-hover:text-blue-300")}>Open Terminal</span>
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 transform group-hover:translate-x-2", `bg-${option.color}-500`, theme === 'modern' ? `shadow-[0_0_15px_rgba(var(--${option.color}-500-rgb),0.3)]` : `shadow-lg shadow-${option.color}-100`)}>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Global Utility Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 pt-4">
        <Card className={cn("border-none text-white p-8 overflow-hidden relative", theme === 'modern' ? "bg-slate-900/60 backdrop-blur-xl border border-slate-800/50" : "bg-gray-900")}>
           <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
             <Activity className="h-48 w-48 text-white" />
           </div>
           <div className="relative z-10">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-4">Maintenance Summary</h4>
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <Clock className="h-5 w-5 text-gray-500" />
                       <span className="text-sm font-bold">Total Operations Logs</span>
                    </div>
                    <span className="text-2xl font-black text-white">{stats.isolationActive + stats.equipmentOpen + stats.unsatisfactoryCount}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <ShieldCheck className="h-5 w-5 text-emerald-500" />
                       <span className="text-sm font-bold">Standard Integrity Score</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-400">94.2%</span>
                 </div>
              </div>
              <Button 
                variant="ghost" 
                className="mt-8 text-xs font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 p-0"
                onClick={() => navigate('/reports')}
              >
                View Full Audit History <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
           </div>
        </Card>

        <Card className={cn("border-2 border-dashed p-8 flex flex-col items-center justify-center text-center opacity-60 backdrop-blur-xl", theme === 'modern' ? "bg-slate-900/20 border-slate-800" : "bg-white border-gray-100")}>
           <LayoutGrid className={cn("h-12 w-12 mb-4", theme === 'modern' ? "text-slate-700" : "text-gray-200")} />
           <p className={cn("text-xs font-black uppercase tracking-widest", theme === 'modern' ? "text-slate-500" : "text-gray-400")}>More Utilities Coming Soon</p>
           <p className={cn("text-[10px] mt-2 max-w-[200px]", theme === 'modern' ? "text-slate-600" : "text-gray-300")}>Expandable architecture for additional safety and compliance modules.</p>
        </Card>
      </div>
    </div>
  );
}
