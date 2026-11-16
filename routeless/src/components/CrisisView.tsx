import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { runCrisisReallocation } from '../engine/crisisAllocator';
import { formatMinutesToHHMM } from '../engine/routing';
import {
  Bus,
  BusStatus,
  Driver,
  RoadSegment,
  Stop,
  StudentCrisisRequest,
} from '../types/routeless';

interface CrisisViewProps {
  buses: Bus[];
  drivers: Driver[];
  roads: RoadSegment[];
  stops: Stop[];
  requests: StudentCrisisRequest[];
  onToggleRoad: (roadId: string, isClosed: boolean, reason?: string) => void;
  onUpdateBus: (
    busId: string,
    patch: Partial<{ status: BusStatus; statusNote: string }>
  ) => void;
  onAddRequest: (
    req: Omit<StudentCrisisRequest, 'id' | 'requestedAt' | 'studentCode'>
  ) => void;
  onRemoveRequest: (requestId: string) => void;
}

export const CrisisView: React.FC<CrisisViewProps> = ({
  buses,
  drivers,
  roads,
  stops,
  requests,
  onToggleRoad,
  onUpdateBus,
  onAddRequest,
  onRemoveRequest,
}) => {
  const stopMap = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const [studentName, setStudentName] = useState('');
  const [originStopId, setOriginStopId] = useState('s1');
  const [destStopId, setDestStopId] = useState('s10');
  const [examDeadline, setExamDeadline] = useState('08:30');
  const [hasExam, setHasExam] = useState(true);
  const [lastRunTick, setLastRunTick] = useState(Date.now());

  const allocation = useMemo(() => {
    return runCrisisReallocation({
      buses,
      drivers,
      roads,
      requests,
      nowMs: lastRunTick,
    });
  }, [buses, drivers, roads, requests, lastRunTick]);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    onAddRequest({
      studentName: `${studentName.trim()} (Demo)`,
      originStopId,
      destinationStopId: destStopId,
      examDeadline: hasExam && examDeadline ? examDeadline : undefined,
      seatCount: 1,
      priorityNote: hasExam ? 'Added Exam Request' : 'Added Regular Request',
    });
    setStudentName('');
    setLastRunTick(Date.now());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Crisis Dispatch &amp; Capacity Reallocation · Deterministic Priority-Greedy Heuristic
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Disruption Response &amp; Student Reallocation
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setLastRunTick(Date.now())}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <AlertOctagon className="h-4 w-4" />
          Recompute Reallocation Heuristic
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Requests</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {allocation.summary.totalRequests}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Exam Priority Assigned</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {allocation.summary.examPriorityAssigned} /{' '}
            {allocation.summary.examPriorityTotal}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Assigned</p>
          <p className="mt-1 font-mono text-2xl font-bold text-blue-700 tabular-nums">
            {allocation.summary.assignedCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Unassigned (With Reason)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {allocation.summary.unassignedCount}
          </p>
        </div>
      </div>

      {/* Disruption Controls: Roads + Buses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">
            1. Road Disruption Controls
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Toggle road closures to test rerouting and infeasibility diagnostics
          </p>
          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
            {roads.map((road) => (
              <div
                key={road.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {road.name}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {stopMap.get(road.fromStopId)?.name} ↔{' '}
                    {stopMap.get(road.toStopId)?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onToggleRoad(
                      road.id,
                      !road.isClosed,
                      !road.isClosed ? 'Crisis event closure (demo)' : undefined
                    )
                  }
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    road.isClosed
                      ? 'bg-red-700 text-white hover:bg-red-800'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {road.isClosed ? 'CLOSED (Reopen)' : 'Open (Close)'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">
            2. Bus Availability &amp; Strict Capacity Ledger
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Heuristic never exceeds bus capacity (Baseline + Crisis Allocated &le; Capacity)
          </p>
          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
            {allocation.busSnapshots.map((snap) => {
              const bus = buses.find((b) => b.id === snap.busId)!;
              const usedTotal = snap.baselineOccupied + snap.crisisAllocated;
              const pct = Math.min(
                100,
                Math.round((usedTotal / Math.max(1, snap.totalCapacity)) * 100)
              );
              return (
                <div
                  key={snap.busId}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">
                        {snap.busCode}
                      </span>{' '}
                      <span className="text-slate-600">· {snap.routeName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBus(bus.id, {
                          status:
                            bus.status === 'unavailable'
                              ? 'available'
                              : 'unavailable',
                          statusNote:
                            bus.status === 'unavailable'
                              ? 'Restored in Crisis Dashboard'
                              : 'Disabled in Crisis Dashboard',
                        })
                      }
                      className={`shrink-0 rounded-md px-2.5 py-1 font-semibold ${
                        bus.status === 'unavailable'
                          ? 'bg-red-700 text-white hover:bg-red-800'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {bus.status === 'unavailable' ? 'Unavailable (Restore)' : 'Disable Bus'}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-600 tabular-nums">
                    {snap.excludedReason ? (
                      <span className="font-semibold text-red-700">
                        Excluded: {snap.excludedReason}
                      </span>
                    ) : (
                      <span>
                        Baseline {snap.baselineOccupied} + Crisis{' '}
                        <strong className="text-blue-700">
                          +{snap.crisisAllocated}
                        </strong>{' '}
                        / {snap.totalCapacity} cap ({snap.remainingSeats} left)
                      </span>
                    )}
                    <span>{snap.excludedReason ? '0%' : `${pct}%`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Crisis Student Request */}
      <form
        onSubmit={handleAddStudent}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-sm font-bold text-slate-900">
          Add Demo Student Request to Crisis Queue
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            type="text"
            required
            placeholder="Student name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
          <select
            value={originStopId}
            onChange={(e) => setOriginStopId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            {stops
              .filter((s) => !s.isEducationalDestination)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  From: {s.name}
                </option>
              ))}
          </select>
          <select
            value={destStopId}
            onChange={(e) => setDestStopId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            {stops
              .filter((s) => s.isEducationalDestination)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  To: {s.name}
                </option>
              ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={hasExam}
                onChange={(e) => setHasExam(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Exam
            </label>
            <input
              type="time"
              disabled={!hasExam}
              value={examDeadline}
              onChange={(e) => setExamDeadline(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-2 font-mono text-xs disabled:bg-slate-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Request
          </button>
        </div>
      </form>

      {/* Allocation Outcome Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Reallocation Outcomes (Auditable Heuristic Output)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Method: {allocation.methodLabel}. Exam deadlines are ranked first, then earliest request time.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Student &amp; Corridor</th>
                <th className="px-4 py-3">Priority / Exam</th>
                <th className="px-4 py-3">Allocation Outcome</th>
                <th className="px-4 py-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocation.outcomes.map((item) => {
                const origin = stopMap.get(item.request.originStopId);
                const dest = stopMap.get(item.request.destinationStopId);
                return (
                  <tr key={item.request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 align-top font-mono text-xs font-bold text-slate-700 tabular-nums">
                      #{item.rankIndex}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-semibold text-slate-900">
                        {item.request.studentName}{' '}
                        <span className="font-mono text-xs font-normal text-slate-500">
                          ({item.request.studentCode})
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {origin?.name} → {dest?.name}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs">
                      {item.request.examDeadline ? (
                        <div>
                          <span className="font-mono font-bold text-amber-800">
                            EXAM {item.request.examDeadline}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            {item.request.priorityNote}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          Regular class · {item.request.priorityNote ?? 'Standard'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs">
                      {item.allocated && item.journey ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Assigned · Arrives{' '}
                            <span className="font-mono tabular-nums">
                              {formatMinutesToHHMM(item.journey.arrivalTimeMin)}
                            </span>
                          </span>
                          <p className="mt-0.5 text-slate-700">
                            {item.journey.legs
                              .map(
                                (l) =>
                                  `${l.busCode} (${stopMap.get(l.boardStopId)?.name} → ${
                                    stopMap.get(l.alightStopId)?.name
                                  })`
                              )
                              .join(' → ')}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 font-bold text-red-700">
                            <ShieldAlert className="h-4 w-4" />
                            Unassigned
                          </span>
                          <p className="mt-0.5 font-medium text-red-900">
                            {item.unassignedReason}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveRequest(item.request.id)}
                        aria-label={`Remove request for ${item.request.studentName}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
