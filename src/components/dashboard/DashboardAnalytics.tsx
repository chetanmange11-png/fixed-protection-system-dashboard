import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { TestRecord } from '../../types';

interface DashboardAnalyticsProps {
  records: TestRecord[];
}

export function DashboardAnalytics({ records }: DashboardAnalyticsProps) {
  const data = React.useMemo(() => {
    const satisfied = records.filter(r => r.healthCondition === 'Satisfactory').length;
    const unsatisfactory = records.filter(r => r.healthCondition === 'Unsatisfactory').length;
    
    return [
      { name: 'Satisfactory', value: satisfied },
      { name: 'Pending/Issues', value: unsatisfactory },
    ];
  }, [records]);

  const COLORS = ['#22c55e', '#ef4444'];

  return (
    <Card className="h-[300px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-wider text-gray-500">
          HEALTH CONDITION OVERVIEW
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
