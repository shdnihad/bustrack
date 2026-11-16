import React, { useState } from 'react';
import { RefreshCw, RotateCcw, Wifi, WifiOff, X } from 'lucide-react';
import { formatAgeLabel } from '../engine/routing';
import { QueuedUpdate } from '../types/routeless';
import { PWAInstallButton } from './PWAInstallButton';

interface NetworkSyncPanelProps {
  open: boolean;
  onClose: () => void;
  browserOnline: boolean;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: (offline: boolean) => void;
  lastSyncedAt: string;
  syncQueue: QueuedUpdate[];
  onSyncNow: () => { syncedCount: number; duplicateCount: number };
  onResetDemo: () => void;
}

export const NetworkSyncPanel: React.FC<NetworkSyncPanelProps> = ({
  open,
  onClose,
  browserOnline,
  simulatedOffline,
  onToggleSimulatedOffline,
  lastSyncedAt,
  syncQueue,
  onSyncNow,
  onResetDemo,
}) => {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  const effectiveOffline = !browserOnline || simulatedOffline;
  const pendingCount = syncQueue.filter((q) => q.syncState === 'queued').length;

  const handleSync = () => {
    const res = onSyncNow();
    if (res.syncedCount === 0 && res.duplicateCount === 0) {
      setSyncMessage('No pending offline updates to synchronize.');
    } else {
      setSyncMessage(
        `Synchronized ${res.syncedCount} queued update(s) with original timestamps${
          res.duplicateCount > 0 ? ` (${res.duplicateCount} duplicate skipped)` : ''
        }.`
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/40 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Network simulation and offline sync manager"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Network &amp; Offline Sync Controls
            </h2>
            <p className="text-xs text-slate-500">
              Test offline caching, queued driver updates, and sync reconciliation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close network panel"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Connectivity Status */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {effectiveOffline ? (
                  <WifiOff className="h-4 w-4 text-amber-700" />
                ) : (
                  <Wifi className="h-4 w-4 text-emerald-700" />
                )}
                <span className="text-sm font-semibold text-slate-900">
                  {!browserOnline
                    ? 'Browser Offline (Real)'
                    : simulatedOffline
                    ? 'Simulated Offline Mode'
                    : 'Online (Demo Local Store)'}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                Synced {formatAgeLabel(lastSyncedAt)}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {effectiveOffline
                ? 'Device uses saved local timetable & bus snapshots only. Driver updates are queued locally and not transmitted to other devices until connectivity returns.'
                : 'Device can read/write simulated demo records immediately and flush any queued offline driver updates.'}
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-medium text-slate-700">
                Simulate Network Blackout
              </span>
              <button
                type="button"
                onClick={() => {
                  setSyncMessage(null);
                  onToggleSimulatedOffline(!simulatedOffline);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  simulatedOffline
                    ? 'bg-amber-700 text-white hover:bg-amber-800'
                    : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                }`}
              >
                {simulatedOffline ? 'Go Back Online' : 'Go Offline'}
              </button>
            </div>
          </div>

          {/* Sync Queue */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pending Driver Update Queue
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {pendingCount} queued · {syncQueue.length} total logged
                </p>
              </div>
              <button
                type="button"
                disabled={effectiveOffline || pendingCount === 0}
                onClick={handleSync}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Queue
              </button>
            </div>

            {syncMessage && (
              <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800">
                {syncMessage}
              </p>
            )}

            {syncQueue.length > 0 && (
              <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto border-t border-slate-100 pt-3">
                {[...syncQueue].reverse().slice(0, 8).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <span className="text-slate-700">{item.summary}</span>
                    <span
                      className={`shrink-0 font-mono ${
                        item.syncState === 'queued'
                          ? 'text-amber-700 font-semibold'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.syncState === 'queued' ? 'QUEUED' : 'SYNCED'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* PWA Install & Demo Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <PWAInstallButton />

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Demo Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemo();
                    setConfirmReset(false);
                    setSyncMessage('Demo dataset restored to initial seed state.');
                  }}
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
