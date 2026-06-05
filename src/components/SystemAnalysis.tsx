import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Card, CardContent } from './ui/Card';
import { TestRecord } from '../types';

interface SystemAnalysisProps {
  records: TestRecord[];
  isVisible: boolean;
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'];

export function SystemAnalysis({ records, isVisible }: SystemAnalysisProps) {
  const chartData = useMemo(() => {
    // 1. Compliance Overview
    let completedCount = 0;
    let pendingCount = 0;
    
    // 2. Failure Trends (Top 5 reasons)
    const failureMap = new Map<string, number>();

    // 3. Workload Distribution (Completed tests per tester)
    const workloadMap = new Map<string, number>();

    // 4. Monthly Burn-down (Completion progress over months)
    const monthlyItems = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const monthlyMap = new Map<string, { month: string, Completed: number }>();
    monthlyItems.forEach(m => monthlyMap.set(m, { month: m, Completed: 0 }));

    records.forEach(r => {
      // Compliance
      const isCompleted = r.status === 'Completed' || r.status === 'Approved & Locked';
      if (isCompleted) {
        completedCount++;
      } else {
        pendingCount++;
      }

      // Failure Trends
      if (r.status === 'Unsatisfactory') {
        const reason = r.deficiency ? r.deficiency.substring(0, 30) + (r.deficiency.length > 30 ? '...' : '') : 'No specific reason';
        failureMap.set(reason, (failureMap.get(reason) || 0) + 1);
      }

      // Workload
      if (isCompleted && r.testerName) {
        workloadMap.set(r.testerName, (workloadMap.get(r.testerName) || 0) + 1);
      }

      // Monthly Burn-down
      let mName = r.scheduleMonth || 'Unknown';
      if (!r.scheduleMonth && (r.testDate || r.dateOfTesting)) {
          const dateStr = r.testDate || r.dateOfTesting || '';
          if (dateStr) {
             const d = new Date(dateStr);
             if (!isNaN(d.getTime())) {
                 mName = d.toLocaleString('default', { month: 'short' });
             }
          }
      }
      
      const mSubStr = String(mName).substring(0,3);
      const standardMonth = monthlyItems.find(m => mSubStr.toLowerCase() === m.toLowerCase());
      if (isCompleted && standardMonth) {
        monthlyMap.get(standardMonth)!.Completed += 1;
      }
    });

    const complianceData = [
      { name: 'Completed', value: completedCount },
      { name: 'Pending', value: pendingCount }
    ];

    const failureData = Array.from(failureMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const workloadData = Array.from(workloadMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const monthlyBurndownData = Array.from(monthlyMap.values());

    return { complianceData, failureData, workloadData, monthlyBurndownData };
  }, [records]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
        animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      >
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Compliance Overview</h3>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.complianceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell key="cell-0" fill="#10B981" />
                    <Cell key="cell-1" fill="#EF4444" />
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Failure Trends (Top 5)</h3>
            <div className="h-64 w-full text-xs">
              {chartData.failureData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.failureData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                    <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium">No recorded failures</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Workload Distribution</h3>
            <div className="h-64 w-full text-xs">
              {chartData.workloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Completed Tests" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium">No completed tests assigned</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Monthly Burn-Down</h3>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.monthlyBurndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Completed" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
