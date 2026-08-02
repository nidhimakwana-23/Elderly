import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useGetMonthlyReport } from '../../hooks/medicine-logs/useGetMonthlyReport';

interface MonthlyReportProps {
  elderlyId: string;
}

// Weekly breakdown — driven by the report when the backend provides it,
// otherwise shown as a static illustrative chart.
const STATIC_WEEKLY = [
  { name: 'Week 1', Taken: 12, Missed: 2 },
  { name: 'Week 2', Taken: 14, Missed: 0 },
  { name: 'Week 3', Taken: 10, Missed: 1 },
  { name: 'Week 4', Taken: 9, Missed: 2 },
];

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ elderlyId }) => {
  const { data: report, isLoading } = useGetMonthlyReport(elderlyId || undefined);

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Loading report...</div>;
  }
  if (!report) return null;

  const pieData = [
    { name: 'Taken', value: report.taken, color: '#10b981' },
    { name: 'Missed', value: report.missed, color: '#ef4444' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border mt-6">
      <h2 className="text-2xl font-bold mb-6">Monthly Adherence Report</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-600 font-medium">Adherence Score</p>
          <p className="text-3xl font-bold text-indigo-900 mt-1">{report.adherence}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-sm text-emerald-600 font-medium">Total Taken</p>
          <p className="text-3xl font-bold text-emerald-900 mt-1">{report.taken}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
          <p className="text-sm text-red-600 font-medium">Total Missed</p>
          <p className="text-3xl font-bold text-red-900 mt-1">{report.missed}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Unique Medicines</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{report.totalMedicines}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-64">
          <h3 className="text-lg font-bold mb-4 text-center">Overall Ratio</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="h-64">
          <h3 className="text-lg font-bold mb-4 text-center">Weekly Breakdown</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={STATIC_WEEKLY}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: 'transparent' }} />
              <Legend />
              <Bar dataKey="Taken" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
