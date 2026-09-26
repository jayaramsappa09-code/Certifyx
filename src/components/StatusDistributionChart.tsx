import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { CheckCircle2, Clock, CircleDashed, BarChart3, PieChart, Sparkles } from 'lucide-react';

interface StatusDistributionChartProps {
  totalStudents: number; // 67
  completedCount: number;
  pendingCount: number;
  notStartedCount: number;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-white">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: data.fill }}
          />
          <span>{data.name} Status</span>
        </div>
        <div className="text-slate-300 font-mono flex items-center justify-between gap-4">
          <span>Student Count:</span>
          <span className="font-bold text-white">{data.count} / {data.total}</span>
        </div>
        <div className="text-slate-400 font-mono flex items-center justify-between gap-4">
          <span>Percentage:</span>
          <span className="font-bold text-emerald-400">{data.percentage}%</span>
        </div>
        <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-800">
          {data.description}
        </p>
      </div>
    );
  }
  return null;
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  totalStudents,
  completedCount,
  pendingCount,
  notStartedCount,
  activeFilter,
  onSelectFilter,
}) => {
  const data = [
    {
      name: 'COMPLETED',
      count: completedCount,
      total: totalStudents,
      percentage: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0,
      fill: '#10b981', // emerald-500
      gradientFrom: '#10b981',
      gradientTo: '#059669',
      filterKey: 'COMPLETED',
      icon: CheckCircle2,
      description: 'Drive file verified + Sheet row updated + Admin confirmed',
    },
    {
      name: 'PENDING',
      count: pendingCount,
      total: totalStudents,
      percentage: totalStudents > 0 ? Math.round((pendingCount / totalStudents) * 100) : 0,
      fill: '#f59e0b', // amber-500
      gradientFrom: '#f59e0b',
      gradientTo: '#d97706',
      filterKey: 'PENDING',
      icon: Clock,
      description: 'Partial completion (file uploaded or sheet entry found, awaiting full verification)',
    },
    {
      name: 'NOT STARTED',
      count: notStartedCount,
      total: totalStudents,
      percentage: totalStudents > 0 ? Math.round((notStartedCount / totalStudents) * 100) : 0,
      fill: '#64748b', // slate-500
      gradientFrom: '#64748b',
      gradientTo: '#475569',
      filterKey: 'NOT_STARTED',
      icon: CircleDashed,
      description: 'No Google Drive file uploaded or Google Sheet entry found for student roll number',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Chart Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Roster Status Distribution
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                {totalStudents} Class Roster
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time distribution of COMPLETED, PENDING, and NOT STARTED statuses
            </p>
          </div>
        </div>

        {/* Legend / Status Pill Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {data.map((item) => (
            <button
              key={item.name}
              onClick={() => onSelectFilter?.(item.filterKey)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                activeFilter === item.filterKey
                  ? 'bg-slate-800 border-slate-600 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span>{item.name}</span>
              <span className="font-mono text-[11px] text-slate-400">
                ({item.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            barCategoryGap="25%"
          >
            <defs>
              {data.map((d) => (
                <linearGradient
                  key={`gradient-${d.name}`}
                  id={`color-${d.name.replace(/\s+/g, '')}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={d.gradientFrom} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={d.gradientTo} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#334155"
              opacity={0.5}
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              domain={[0, Math.max(totalStudents, 10)]}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />

            <Bar
              dataKey="count"
              radius={[8, 8, 0, 0]}
              onClick={(entry: any) => onSelectFilter?.(entry?.payload?.filterKey || entry?.filterKey)}
              className="cursor-pointer transition-opacity hover:opacity-80"
            >
              <LabelList
                dataKey="count"
                position="top"
                fill="#f8fafc"
                fontSize={13}
                fontWeight={700}
                formatter={(val: unknown) => `${val}`}
              />
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={`url(#color-${entry.name.replace(/\s+/g, '')})`}
                  stroke={entry.fill}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Breakdown Cards below chart */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {data.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              onClick={() => onSelectFilter?.(item.filterKey)}
              className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${item.fill}15`, color: item.fill }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {item.percentage}% of class roster
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-base font-bold text-white">{item.count}</div>
                <div className="text-[10px] text-slate-500">/ {totalStudents}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
