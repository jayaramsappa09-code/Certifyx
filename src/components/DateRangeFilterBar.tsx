import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Filter,
  TrendingUp,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  BarChart2,
  Users,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  DatePresetType,
  DateFilterBasis,
  DateRangeFilterConfig,
  StudentStatusRecord,
} from '../types';
import {
  getDatesFromPreset,
  analyzeDateRangeProgress,
  DateRangeAnalysisResult,
} from '../utils/dateFilterUtils';

interface DateRangeFilterBarProps {
  students: StudentStatusRecord[];
  config: DateRangeFilterConfig;
  onChangeConfig: (nextConfig: DateRangeFilterConfig) => void;
  onExportPeriodCsv?: (analysis: DateRangeAnalysisResult) => void;
}

export const DateRangeFilterBar: React.FC<DateRangeFilterBarProps> = ({
  students,
  config,
  onChangeConfig,
  onExportPeriodCsv,
}) => {
  const [showTimelineChart, setShowTimelineChart] = useState(false);

  // Compute analytics
  const analysis = analyzeDateRangeProgress(students, config);

  const presets: Array<{ id: DatePresetType; label: string; sub: string }> = [
    { id: 'ALL_TIME', label: 'All Time', sub: 'Entire History' },
    { id: 'TODAY', label: 'Today', sub: 'Current Day' },
    { id: 'LAST_7_DAYS', label: 'Last 7 Days', sub: 'Past Week' },
    { id: 'LAST_14_DAYS', label: 'Last 14 Days', sub: 'Bi-Weekly' },
    { id: 'LAST_30_DAYS', label: 'Last 30 Days', sub: 'Past Month' },
    { id: 'THIS_MONTH', label: 'This Month', sub: 'Month-to-Date' },
    { id: 'CUSTOM', label: 'Custom Range', sub: 'Select Dates' },
  ];

  const handleSelectPreset = (preset: DatePresetType) => {
    if (preset === 'CUSTOM') {
      onChangeConfig({
        ...config,
        preset: 'CUSTOM',
      });
      return;
    }

    const { startDate, endDate } = getDatesFromPreset(preset);
    onChangeConfig({
      ...config,
      preset,
      startDate,
      endDate,
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    onChangeConfig({
      ...config,
      preset: 'CUSTOM',
      startDate: val,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    onChangeConfig({
      ...config,
      preset: 'CUSTOM',
      endDate: val,
    });
  };

  const handleBasisChange = (basis: DateFilterBasis) => {
    onChangeConfig({
      ...config,
      basis,
    });
  };

  const handleReset = () => {
    onChangeConfig({
      preset: 'ALL_TIME',
      startDate: null,
      endDate: null,
      basis: 'ALL',
      activeOnlyMatchingStudents: false,
    });
  };

  const isFilterActive = config.preset !== 'ALL_TIME' || config.startDate !== null || config.endDate !== null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Submission Timeline &amp; Date Filter</span>
                {isFilterActive && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Active Filter
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyze student certificate submissions, Drive uploads, and verification velocity over specific time windows.
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Table filter toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-300 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={config.activeOnlyMatchingStudents}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  activeOnlyMatchingStudents: e.target.checked,
                })
              }
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-700 border-slate-600 cursor-pointer"
            />
            <span>Filter Student Table</span>
          </label>

          {/* Toggle Timeline Graph */}
          <button
            onClick={() => setShowTimelineChart(!showTimelineChart)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              showTimelineChart
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{showTimelineChart ? 'Hide Trendline' : 'View Velocity Chart'}</span>
            {showTimelineChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Export Period CSV */}
          {onExportPeriodCsv && (
            <button
              onClick={() => onExportPeriodCsv(analysis)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Download detailed CSV report of student activity in this time period"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Period CSV</span>
            </button>
          )}

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/20 rounded-xl transition flex items-center gap-1 cursor-pointer"
              title="Clear date filter and view all time"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Pills & Custom Pickers */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800/60 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 md:pb-0">
            {presets.map((p) => {
              const isSelected = config.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Activity Source Basis Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Source:</span>
            <select
              value={config.basis}
              onChange={(e) => handleBasisChange(e.target.value as DateFilterBasis)}
              aria-label="Activity source filter"
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Sources (Drive &amp; Sheet)</option>
              <option value="SHEET_ONLY">Google Sheet Submissions</option>
              <option value="DRIVE_ONLY">Google Drive Uploads</option>
              <option value="STATUS_ONLY">Status Verifications</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers (visible if custom or specific range selected) */}
        {(config.preset === 'CUSTOM' || config.startDate || config.endDate) && (
          <div className="pt-2 border-t border-slate-800/50 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400 font-medium">Start Date:</span>
              <input
                type="date"
                value={config.startDate || ''}
                onChange={handleStartDateChange}
                aria-label="Filter start date"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400 font-medium">End Date:</span>
              <input
                type="date"
                value={config.endDate || ''}
                onChange={handleEndDateChange}
                aria-label="Filter end date"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {config.startDate && config.endDate && (
              <span className="text-xs text-slate-400 font-mono">
                {new Date(config.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                {' — '}
                {new Date(config.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Period Analytics KPI Stats Bar */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50">
        {/* Active Students */}
        <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active in Period</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              {analysis.activeStudentsInRange}
            </span>
            <span className="text-xs text-slate-400">
              / {analysis.totalRosterStudents} ({analysis.activePercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-700/50 h-1 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${analysis.activePercentage}%` }}
            />
          </div>
        </div>

        {/* Sheet Submissions */}
        <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Sheet Submissions</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
              {analysis.sheetSubmissionsInRange}
            </span>
            <span className="text-xs text-slate-400">entries</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">Google Form response timestamps</p>
        </div>

        {/* Drive Uploads */}
        <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Drive Uploads</span>
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-cyan-400 font-mono">
              {analysis.driveUploadsInRange}
            </span>
            <span className="text-xs text-slate-400">files</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">Certificate PDFs &amp; images created</p>
        </div>

        {/* Completed in Period */}
        <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Fully Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-purple-400 font-mono">
              {analysis.completedInRange}
            </span>
            <span className="text-xs text-slate-400">students</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {analysis.peakDay ? `Peak activity on ${analysis.peakDay.date}` : 'No submissions yet'}
          </p>
        </div>
      </div>

      {/* Expandable Recharts Velocity Trendline */}
      {showTimelineChart && (
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Daily Submission Velocity &amp; Cumulative Trend</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Track peak submission days and total certificate throughput across Google Drive &amp; Sheets.
              </p>
            </div>

            {analysis.peakDay && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono hidden sm:block">
                ⚡ Peak Day: <span className="font-bold text-white">{analysis.peakDay.date}</span> ({analysis.peakDay.count} submissions)
              </div>
            )}
          </div>

          {analysis.dailyTimeline.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs space-y-1 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
              <Clock className="w-6 h-6 text-slate-600 mb-1" />
              <p>No dated submissions found within the selected time window.</p>
              <p className="text-[11px] text-slate-600">Select "All Time" or widen your date filter.</p>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analysis.dailyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 font-mono">
                            <p className="font-bold text-white border-b border-slate-800 pb-1">{data.dateStr} ({label})</p>
                            <div className="flex justify-between gap-4 text-emerald-400">
                              <span>Sheet Submissions:</span>
                              <span className="font-bold">{data.sheetSubmissions}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-cyan-400">
                              <span>Drive Uploads:</span>
                              <span className="font-bold">{data.driveUploads}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-blue-400">
                              <span>Active Students:</span>
                              <span className="font-bold">{data.activeStudents}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-purple-400 pt-1 border-t border-slate-800">
                              <span>Cumulative Progress:</span>
                              <span className="font-bold">{data.cumulativeActivities}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconSize={10}
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  />
                  <Bar dataKey="sheetSubmissions" name="Sheet Submissions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="driveUploads" name="Drive Uploads" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={14} />
                  <Line
                    type="monotone"
                    dataKey="cumulativeActivities"
                    name="Cumulative Total"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={{ fill: '#a855f7', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
