import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Navigation,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { formatAgeLabel } from '../engine/routing';
import {
  Bus,
  BusStatus,
  Driver,
  QueuedUpdate,
  Stop,
} from '../types/routeless';

interface DriverViewProps {
  drivers: Driver[];
  buses: Bus[];
  stops: Stop[];
  activeDriverId: string;
  onSelectDriver: (driverId: string) => void;
  effectiveOffline: boolean;
  syncQueue: QueuedUpdate[];
  onSubmitUpdate: (params: {
    driverId: string;
    busId: string;
    updateType: 'status' | 'gps_step' | 'occupancy';
    summary: string;
    payload: QueuedUpdate['payload'];
  }) => { ok: boolean; mode: 'applied' | 'queued' | 'rejected'; message: string };
  onSyncQueue: () => { syncedCount: number; duplicateCount: number };
}

export const DriverView: React.FC<DriverViewProps> = ({
  drivers,
  buses,
  stops,
  activeDriverId,
  onSelectDriver,
  effectiveOffline,
  syncQueue,
  onSubmitUpdate,
  onSyncQueue,
}) => {
  const activeDriver =
    drivers.find((d) => d.id === activeDriverId) ?? drivers[0];
  const assignedBus = buses.find((b) => b.id === activeDriver.assignedBusId);
  const stopMap = new Map(stops.map((s) => [s.id, s]));

  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'queued' | 'error';
    text: string;
  } | null>(null);
  const [delayInput, setDelayInput] = useState(
    assignedBus?.delayMinutes ? String(assignedBus.delayMinutes) : '10'
  );
  const [noteInput, setNoteInput] = useState('');

  const isAuthorized = activeDriver.verificationStatus === 'approved';
  const driverQueue = syncQueue.filter(
    (q) => q.driverId === activeDriver.id
  );
  const queuedCount = driverQueue.filter((q) => q.syncState === 'queued').length;

  const handleStatusChange = (status: BusStatus) => {
    if (!assignedBus) return;
    const delayMins = status === 'delayed' ? Math.max(1, Number(delayInput) || 10) : 0;
    const res = onSubmitUpdate({
      driverId: activeDriver.id,
      busId: assignedBus.id,
      updateType: 'status',
      summary: `${assignedBus.code} marked ${status}${
        status === 'delayed' ? ` (+${delayMins}m)` : ''
      }`,
      payload: {
        status,
        delayMinutes: delayMins,
        statusNote:
          noteInput.trim() ||
          `Driver update (${status}) at ${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
      },
    });
    setFeedback({
      tone: res.mode === 'queued' ? 'queued' : res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleSimulateNextStop = () => {
    if (!assignedBus) return;
    const nextIdx =
      (assignedBus.currentStopIndex + 1) % assignedBus.schedule.length;
    const nextStopId = assignedBus.schedule[nextIdx].stopId;
    const nextStopName = stopMap.get(nextStopId)?.name ?? nextStopId;

    const res = onSubmitUpdate({
      driverId: activeDriver.id,
      busId: assignedBus.id,
      updateType: 'gps_step',
      summary: `${assignedBus.code} simulated GPS step → ${nextStopName}`,
      payload: {
        currentStopId: nextStopId,
        currentStopIndex: nextIdx,
      },
    });
    setFeedback({
      tone: res.mode === 'queued' ? 'queued' : res.ok ? 'success' : 'error',
      text: `${res.message} Stop: ${nextStopName}`,
    });
  };

  const handleOccupancyChange = (delta: number) => {
    if (!assignedBus) return;
    const nextOccupied = Math.min(
      assignedBus.capacity,
      Math.max(0, assignedBus.occupiedSeats + delta)
    );
    const res = onSubmitUpdate({
      driverId: activeDriver.id,
      busId: assignedBus.id,
      updateType: 'occupancy',
      summary: `${assignedBus.code} occupancy updated to ${nextOccupied}/${assignedBus.capacity}`,
      payload: {
        occupiedSeats: nextOccupied,
      },
    });
    setFeedback({
      tone: res.mode === 'queued' ? 'queued' : res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Demo Sign-in Switcher */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Demo Driver Console · Role-Scoped Permissions (Assigned Bus Only)
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Driver Trip &amp; Bus Status Console
          </h1>
        </div>

        <div className="w-full max-w-sm">
          <label
            htmlFor="demo-driver-select"
            className="block text-xs font-semibold text-slate-700"
          >
            Demo Driver Sign-In (Simulated Role Switcher)
          </label>
          <select
            id="demo-driver-select"
            value={activeDriver.id}
            onChange={(e) => {
              onSelectDriver(e.target.value);
              setFeedback(null);
            }}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.verificationStatus.toUpperCase()} ({d.assignedBusId.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Explicit Demo Identity Disclaimer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <strong className="text-slate-900">Prototype Notice:</strong> This demo role switcher simulates driver sessions using fictional records and does not perform real identity or OTP verification. Drivers can update only their own assigned bus.
      </div>

      {/* Authorization Gate Banner for Pending / Rejected Drivers */}
      {!isAuthorized && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-950">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <div>
              <h2 className="text-base font-bold">
                Authorized Trip Blocked — Driver Verification{' '}
                {activeDriver.verificationStatus === 'pending'
                  ? 'Pending'
                  : 'Rejected'}
              </h2>
              <p className="mt-1 text-sm text-red-900">
                {activeDriver.rejectionOrPendingNote ??
                  'An administrator must approve this driver before starting trips or publishing bus status updates.'}
              </p>
              <p className="mt-2 text-xs text-red-800">
                To test unlocking this driver, switch to the <strong>Admin &amp; Verify</strong> tab and approve{' '}
                <strong>{activeDriver.name}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            feedback.tone === 'queued'
              ? 'border-amber-300 bg-amber-50 text-amber-950'
              : feedback.tone === 'error'
              ? 'border-red-300 bg-red-50 text-red-950'
              : 'border-emerald-300 bg-emerald-50 text-emerald-950'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Assigned Bus Control Panel */}
      {assignedBus && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-blue-700">
                  ASSIGNED BUS · {assignedBus.code}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                  {assignedBus.routeName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Last update:{' '}
                  <span className="font-mono">
                    {formatAgeLabel(assignedBus.lastUpdatedAt)}
                  </span>{' '}
                  · Other buses are locked from this driver console
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    assignedBus.status === 'available'
                      ? 'text-emerald-700'
                      : assignedBus.status === 'delayed'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {assignedBus.status === 'available' && (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {assignedBus.status === 'delayed' && (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {assignedBus.status === 'unavailable' && (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  {assignedBus.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Bus Status Controls */}
            <div>
              <h3 className="text-xs font-bold text-slate-700">
                1. Update Operational Status
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={!isAuthorized}
                  onClick={() => handleStatusChange('available')}
                  className="h-11 rounded-lg border border-emerald-700 bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Mark Available
                </button>
                <button
                  type="button"
                  disabled={!isAuthorized}
                  onClick={() => handleStatusChange('delayed')}
                  className="h-11 rounded-lg border border-amber-600 bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Mark Delayed (+{delayInput || 10}m)
                </button>
                <button
                  type="button"
                  disabled={!isAuthorized}
                  onClick={() => handleStatusChange('unavailable')}
                  className="h-11 rounded-lg border border-red-700 bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Mark Unavailable
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="driver-delay"
                    className="block text-xs text-slate-600"
                  >
                    Delay Minutes (if delayed)
                  </label>
                  <input
                    id="driver-delay"
                    type="number"
                    min={1}
                    max={120}
                    disabled={!isAuthorized}
                    value={delayInput}
                    onChange={(e) => setDelayInput(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="driver-note"
                    className="block text-xs text-slate-600"
                  >
                    Optional Status Note
                  </label>
                  <input
                    id="driver-note"
                    type="text"
                    disabled={!isAuthorized}
                    placeholder="e.g., Fog delay near ridge"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Simulated GPS Trip Progress */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700">
                    2. Simulate Stop-by-Stop GPS Trip (Demo)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Current stop:{' '}
                    <strong className="text-slate-900">
                      {stopMap.get(assignedBus.currentStopId)?.name}
                    </strong>{' '}
                    ({assignedBus.currentStopIndex + 1} of{' '}
                    {assignedBus.schedule.length})
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isAuthorized}
                  onClick={handleSimulateNextStop}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Advance Simulated Stop
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {assignedBus.schedule.map((item, idx) => {
                  const isCurrent = idx === assignedBus.currentStopIndex;
                  return (
                    <span
                      key={item.stopId}
                      className={`rounded-md border px-2.5 py-1 text-xs ${
                        isCurrent
                          ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {stopMap.get(item.stopId)?.name}{' '}
                      <span className="font-mono">{item.departureTime}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Seat Occupancy */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">
                    3. Seat Occupancy:{' '}
                    <span className="font-mono text-slate-900 tabular-nums">
                      {assignedBus.occupiedSeats} / {assignedBus.capacity}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!isAuthorized}
                    onClick={() => handleOccupancyChange(-2)}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    -2 Alighted
                  </button>
                  <button
                    type="button"
                    disabled={!isAuthorized}
                    onClick={() => handleOccupancyChange(2)}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    +2 Boarded
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Offline Sync Queue Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Driver Offline Queue
                </h2>
                <p className="text-xs text-slate-500">
                  {effectiveOffline
                    ? 'Offline: new updates queue locally and are not yet broadcast'
                    : 'Online: updates apply immediately; queued items can be flushed'}
                </p>
              </div>
              <button
                type="button"
                disabled={effectiveOffline || queuedCount === 0}
                onClick={() => {
                  const res = onSyncQueue();
                  setFeedback({
                    tone: 'success',
                    text: `Synchronized ${res.syncedCount} queued update(s) with preserved timestamps.`,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync ({queuedCount})
              </button>
            </div>

            {driverQueue.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">
                No updates logged for {activeDriver.name} yet. Try toggling Offline in Network &amp; Sync and submitting a status update to inspect offline queuing.
              </p>
            ) : (
              <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                {[...driverQueue].reverse().map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {item.summary}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          item.syncState === 'queued'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {item.syncState === 'queued'
                          ? 'QUEUED LOCALLY'
                          : 'SYNCED'}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                      Created: {new Date(item.createdAt).toLocaleTimeString()}
                      {item.syncedAt
                        ? ` · Synced: ${new Date(item.syncedAt).toLocaleTimeString()}`
                        : ' · Not transmitted to other devices'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
