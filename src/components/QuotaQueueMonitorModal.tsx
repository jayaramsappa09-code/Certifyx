import React, { useState, useEffect } from 'react';
import {
  X,
  Gauge,
  Zap,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { quotaQueueService } from '../services/quotaQueueService';
import { QuotaHealthSnapshot } from '../types';

interface QuotaQueueMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuotaQueueMonitorModal: React.FC<QuotaQueueMonitorModalProps> = ({ isOpen, onClose }) => {
  const [snapshot, setSnapshot] = useState<QuotaHealthSnapshot>(quotaQueueService.getSnapshot());
  const [simulatedSize, setSimulatedSize] = useState<number>(300);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = quotaQueueService.subscribe(setSnapshot);
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const bucketPercent = Math.min(100, Math.round((snapshot.tokenBucketBalance / snapshot.tokenBucketCapacity) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Google Drive API Quota Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  15 req/sec (Safe Cap)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero-Cost Client Queue preventing HTTP 429 Rate Limits without paid cloud queues
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Throttled Rate</span>
              <span className="text-lg font-black text-amber-300 font-mono mt-1 block">
                {snapshot.requestsPerSecond} / sec
              </span>
              <span className="text-[10px] text-slate-500">900 req/min (Max: 1,200)</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">HTTP 429 Errors</span>
              <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                {snapshot.http429Errors}
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold">100% Protected</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Queue</span>
              <span className="text-lg font-black text-blue-400 font-mono mt-1 block">
                {snapshot.queuedTasksCount}
              </span>
              <span className="text-[10px] text-slate-500">
                {snapshot.estimatedTimeToDrainSec > 0 ? `~${snapshot.estimatedTimeToDrainSec}s drain` : 'Idle'}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Processed Tasks</span>
              <span className="text-lg font-black text-purple-300 font-mono mt-1 block">
                {snapshot.processedTasksCount}
              </span>
              <span className="text-[10px] text-purple-400">Total verified</span>
            </div>
          </div>

          {/* Token Bucket Health Bar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-slate-200">Token Bucket Capacity (Burst Reserve)</span>
              </div>
              <span className="font-mono text-amber-300 font-bold">
                {snapshot.tokenBucketBalance} / {snapshot.tokenBucketCapacity} Tokens
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  bucketPercent > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : bucketPercent > 20
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-500 to-rose-400 animate-pulse'
                }`}
                style={{ width: `${bucketPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Auto-refills at a steady 15 tokens/sec</span>
              <span>Smooths sudden spikes into sustained compliance</span>
            </div>
          </div>

          {/* Interactive Concurrent Burst Simulator */}
          <div className="bg-slate-950/90 border border-purple-900/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Simulate Deadline Upload Spike (500–5,000 Users)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate concurrent certificate uploads to witness client queue throttling in action.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={simulatedSize}
                  onChange={(e) => setSimulatedSize(Number(e.target.value))}
                  disabled={snapshot.isBurstSimulating}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5"
                >
                  <option value={100}>100 Students</option>
                  <option value={300}>300 Students</option>
                  <option value={1000}>1,000 Students</option>
                  <option value={5000}>5,000 Students</option>
                </select>
                <button
                  type="button"
                  onClick={() => quotaQueueService.simulateBurst(simulatedSize)}
                  disabled={snapshot.isBurstSimulating}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition ${
                    snapshot.isBurstSimulating
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{snapshot.isBurstSimulating ? 'Processing...' : 'Run Spike'}</span>
                </button>
                {snapshot.queuedTasksCount > 0 && (
                  <button
                    type="button"
                    onClick={() => quotaQueueService.clearQueue()}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
                    title="Drain Queue"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {snapshot.isBurstSimulating && (
              <div className="p-3 bg-purple-950/30 border border-purple-800/50 rounded-xl space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    Processing {snapshot.queuedTasksCount} Tasks at 15 req/sec...
                  </span>
                  <span className="font-mono text-purple-200 font-bold">
                    ETA: ~{snapshot.estimatedTimeToDrainSec}s
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Notice how Google Drive receives requests at a steady cadence. Zero HTTP 429 errors are triggered!
                </div>
              </div>
            )}
          </div>

          {/* Zero Cost Architectural Advantage */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How We Bypass Google's 1,200 req/min Limit at $0 Cost:</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-300">Decentralized Client Quota:</strong> Instead of paying $35/mo for Cloud Run + BullMQ, each student and faculty member processes tasks through their browser's native async event queue.
              </li>
              <li>
                <strong className="text-slate-300">User-Delegated OAuth Tokens:</strong> Google Drive allocates a 300 req/min quota <em className="text-emerald-400">per user token</em>. When 50 faculty or 5,000 students access the app, the pooled institutional throughput is up to 1,500,000 req/min with zero project throttling.
              </li>
              <li>
                <strong className="text-slate-300">Exponential Backoff & Jitter:</strong> Automatic retry with randomized delay protects against transient network blips without manual intervention.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
