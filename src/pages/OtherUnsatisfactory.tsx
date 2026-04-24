import * as React from 'react';
import { 
  Building2, 
  Settings as SettingsIcon, 
  Calendar, 
  ShieldAlert, 
  Search,
  Activity,
  History,
  TrendingUp,
  Droplets,
  Zap,
  ArrowLeft,
  ChevronRight,
  TrendingDown,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HeartOff,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { dbApi } from '../db/storage';
import { TestRecord, Plant, FinancialYear } from '../types';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { RecordEditModal } from '../components/shared/RecordEditModal';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function OtherUnsatisfactory() {
  const navigate = useNavigate();
  const [records, setRecords] = React.useState<TestRecord[]>([]);
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [editingRecord, setEditingRecord] = React.useState<TestRecord | null>(null);
  const [currentYear, setCurrentYear] = React.useState<FinancialYear>('2024-25');

  const loadData = React.useCallback(async () => {
    await dbApi.init();
    const [activeYear, allRecords, allPlants] = await Promise.all([
      dbApi.getActiveYear(),
      dbApi.getTestRecords(),
      dbApi.getPlants()
    ]);
    setCurrentYear(activeYear);
    setRecords(allRecords);
    setPlants(allPlants);
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('fy-change', loadData);
    return () => window.removeEventListener('fy-change', loadData);
  }, [loadData]);

  const unsatisfactoryRecords = records.filter(r => 
    r.healthCondition === 'Unsatisfactory' && 
    r.financialYear === currentYear &&
    (r.plantName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     r.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = React.useMemo(() => {
    const total = records.filter(r => r.financialYear === currentYear).length;
    const unhealthy = records.filter(r => r.healthCondition === 'Unsatisfactory' && r.financialYear === currentYear).length;
    const ration = total > 0 ? (unhealthy / total) * 100 : 0;
    
    return {
      count: unhealthy,
      ratio: ration.toFixed(1),
      trend: unhealthy > 5 ? 'High Risk' : 'Monitoring'
    };
  }, [records, currentYear]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/others')} className="rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Unsatisfactory Systems Portfolio</h1>
            <p className="text-gray-500 font-medium flex items-center">
              <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />
              Critical Maintenance Audit & Defect Tracking
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 font-black text-xs uppercase tracking-widest">
             FY {currentYear} Audit
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-rose-600 border-none text-white shadow-xl shadow-rose-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Defected Assets</span>
              <HeartOff className="h-5 w-5" />
            </div>
            <p className="text-4xl font-black">{stats.count}</p>
            <p className="text-xs font-bold mt-1 opacity-80 uppercase tracking-widest">{stats.trend} Severity</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Impact Ratio</span>
              <TrendingUp className="h-5 w-5 text-gray-200" />
            </div>
            <p className="text-4xl font-black text-gray-900">{stats.ratio}%</p>
            <p className="text-xs font-bold mt-1 text-gray-400 uppercase tracking-widest">Yearly Fleet Burden</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500 border-none text-white shadow-xl shadow-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Remediation Status</span>
               <Clock className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black">Awaiting Action</p>
            <p className="text-xs font-bold mt-1 opacity-80 uppercase tracking-widest">Top Priority Items</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="FILTER BY PLANT OR TAG..."
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-rose-500/10 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
           <Filter className="h-4 w-4" />
           <span>Showing {unsatisfactoryRecords.length} Defects</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {unsatisfactoryRecords.map((record, idx) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
              <div className="h-1 bg-rose-500 w-full" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                     <div className="h-10 w-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5" />
                     </div>
                     <div>
                        <h3 className="font-black text-gray-900 leading-tight">{record.tagNumber}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{record.plantName}</p>
                     </div>
                  </div>
                  <Badge variant="danger" className="text-[8px] px-2 h-5 font-black uppercase border-none">{record.status}</Badge>
                </div>
                
                <div className="space-y-4">
                   <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1 flex items-center">
                        <HeartOff className="h-3 w-3 mr-1" />
                        Observation
                      </p>
                      <p className="text-xs text-rose-900 font-medium line-clamp-2 italic">
                        "{record.deficiency || 'No specific deficiency logged'}"
                      </p>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pb-2 border-b border-gray-50">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">System Period</p>
                        <p className="text-xs font-black text-gray-700 mt-1">{record.cycle}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Report Date</p>
                        <p className="text-xs font-black text-gray-700 mt-1">{record.dateOfTesting || 'Pending'}</p>
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-2">
                       <p className="text-[10px] font-bold text-gray-400">Tested By: <span className="text-gray-900">{record.testedBy || 'N/A'}</span></p>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => setEditingRecord(record)}
                         className="h-8 rounded-xl bg-gray-50 text-gray-900 font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all px-4"
                       >
                         Change Report
                       </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {unsatisfactoryRecords.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-30">
             <div className="h-20 w-20 bg-gray-100 rounded-[2.5rem] flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
             </div>
             <p className="text-xl font-black text-gray-900 tracking-tight">System Integrity Normal</p>
             <p className="text-xs font-bold uppercase tracking-widest mt-2">No unsatisfactory systems found for this filter context.</p>
          </div>
        )}
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
    </div>
  );
}
