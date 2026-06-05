import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Clock, ChevronRight, X } from 'lucide-react';
import { TestRecord } from '../../types';
import { cn } from '../../lib/utils';

interface AlertsPanelProps {
  records: TestRecord[];
}

export function AlertsPanel({ records }: AlertsPanelProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  const { overdue, upcoming } = React.useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(now.getDate() + 15);

    return {
      overdue: records.filter(r => {
        const tDate = new Date(r.testDate);
        return r.status !== 'Completed' && tDate < sixMonthsAgo;
      }),
      upcoming: records.filter(r => {
        const tDate = new Date(r.testDate);
        return r.status !== 'Completed' && tDate >= now && tDate <= fifteenDaysFromNow;
      })
    };
  }, [records]);

  if (!isVisible || (overdue.length === 0 && upcoming.length === 0)) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      >
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 -right-2 h-6 w-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-gray-600 z-10 border border-gray-100"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Overdue Alerts */}
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-black text-xs uppercase tracking-widest">Action Required: Overdue</h3>
              </div>
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                {overdue.length} Total
              </span>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {overdue.map(record => (
                <div key={record.id} className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl flex items-center justify-between group hover:bg-white transition-colors border border-red-50 shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">{record.plantName}</p>
                    <p className="font-bold text-gray-900 text-sm leading-none">{record.tagNumber || record.subSystemName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-red-500 uppercase">Last Test Date</p>
                    <p className="text-[11px] font-black text-gray-700">{new Date(record.testDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Alerts */}
        {upcoming.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-5 w-5" />
                <h3 className="font-black text-xs uppercase tracking-widest">Upcoming Maintenance</h3>
              </div>
              <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                {upcoming.length} Soon
              </span>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {upcoming.map(record => (
                <div key={record.id} className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl flex items-center justify-between group hover:bg-white transition-colors border border-blue-50 shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">{record.plantName}</p>
                    <p className="font-bold text-gray-900 text-sm leading-none">{record.tagNumber || record.subSystemName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-500 uppercase">Scheduled Date</p>
                    <p className="text-[11px] font-black text-gray-700">{new Date(record.testDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
