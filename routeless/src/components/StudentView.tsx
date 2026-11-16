import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bus as BusIcon,
  CheckCircle2,
  Clock,
  Navigation,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  evaluateMissedBusRescue,
  findJourneys,
  formatAgeLabel,
  formatMinutesToHHMM,
  isBusStale,
  parseTimeToMinutes,
} from '../engine/routing';
import { Bus, RoadSegment, Stop, Village } from '../types/routeless';
import { CorridorMap } from './CorridorMap';

interface StudentViewProps {
  villages: Village[];
  stops: Stop[];
  roads: RoadSegment[];
  buses: Bus[];
  effectiveOffline: boolean;
  lastSyncedAt: string;
}

export const StudentView: React.FC<StudentViewProps> = ({
  villages,
  stops,
  roads,
  buses,
  effectiveOffline,
  lastSyncedAt,
}) => {
  const [subMode, setSubMode] = useState<'planner' | 'rescue' | 'fleet'>('planner');
  const [originStopId, setOriginStopId] = useState('s1');
  const [destinationStopId, setDestinationStopId] = useState('s10');
  const [departAfter, setDepartAfter] = useState('07:00');
  const [targetArrival, setTargetArrival] = useState('08:30');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  // Missed Bus Rescue inputs
  const [rescueStopId, setRescueStopId] = useState('s7');
  const [missedBusId, setMissedBusId] = useState('b4');
  const [rescueDestId, setRescueDestId] = useState('s11');
  const [rescueTime, setRescueTime] = useState('07:15');

  const stopMap = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);
  const villageMap = useMemo(() => new Map(villages.map((v) => [v.id, v])), [villages]);

  const searchResult = useMemo(() => {
    return findJourneys({
      originStopId,
      destinationStopId,
      earliestDepartureMin: parseTimeToMinutes(departAfter),
      targetArrivalMin: targetArrival ? parseTimeToMinutes(targetArrival) : undefined,
      buses,
      roads,
    });
  }, [originStopId, destinationStopId, departAfter, targetArrival, buses, roads]);

  const activeJourney = useMemo(() => {
    if (searchResult.options.length === 0) return null;
    return (
      searchResult.options.find((o) => o.id === selectedJourneyId) ??
      searchResult.options[0]
    );
  }, [searchResult.options, selectedJourneyId]);

  const rescueResult = useMemo(() => {
    return evaluateMissedBusRescue({
      stopId: rescueStopId,
      missedBusId,
      destinationStopId: rescueDestId,
      currentTimeMin: parseTimeToMinutes(rescueTime),
      buses,
      roads,
      stops,
    });
  }, [rescueStopId, missedBusId, rescueDestId, rescueTime, buses, roads, stops]);

  const applyPreset = (
    orig: string,
    dest: string,
    dep: string,
    arr: string
  ) => {
    setSubMode('planner');
    setOriginStopId(orig);
    setDestinationStopId(dest);
    setDepartAfter(dep);
    setTargetArrival(arr);
    setSelectedJourneyId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Sub-Navigation */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Student Journey Portal · Fictional Demo Data ·{' '}
            {effectiveOffline
              ? `Offline Cache (Last synced ${formatAgeLabel(lastSyncedAt)})`
              : `Saved Snapshot Synced ${formatAgeLabel(lastSyncedAt)}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Safe School &amp; College Transit Search
          </h1>
        </div>

        <div
          className="inline-flex rounded-lg bg-slate-100 p-1"
          role="tablist"
          aria-label="Student view sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'planner'}
            onClick={() => setSubMode('planner')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              subMode === 'planner'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Journey Planner
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'rescue'}
            onClick={() => setSubMode('rescue')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              subMode === 'rescue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Missed Bus Rescue
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'fleet'}
            onClick={() => setSubMode('fleet')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              subMode === 'fleet'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bus Timetables ({buses.length})
          </button>
        </div>
      </div>

      {/* Offline Banner inside workspace if offline */}
      {effectiveOffline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm">
            <p className="font-semibold">
              Offline Mode Active — Searching Last-Known Saved Data
            </p>
            <p className="mt-0.5 text-xs text-amber-900">
              Showing cached routes and last-known bus statuses from{' '}
              <span className="font-mono">{formatAgeLabel(lastSyncedAt)}</span>. Live driver
              updates or new road closures cannot reach this device until connectivity returns.
            </p>
          </div>
        </div>
      )}

      {subMode === 'planner' && (
        <div className="space-y-6">
          {/* Search Form + Quick Scenarios */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="student-origin"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Boarding Stop
                </label>
                <select
                  id="student-origin"
                  value={originStopId}
                  onChange={(e) => {
                    setOriginStopId(e.target.value);
                    setSelectedJourneyId(null);
                  }}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                >
                  {stops.map((s) => {
                    const v = villageMap.get(s.villageId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({v?.name})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="student-dest"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Destination (School / College)
                </label>
                <select
                  id="student-dest"
                  value={destinationStopId}
                  onChange={(e) => {
                    setDestinationStopId(e.target.value);
                    setSelectedJourneyId(null);
                  }}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                >
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.isEducationalDestination ? `Campus: ${s.name}` : s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="student-depart"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Depart After
                </label>
                <input
                  id="student-depart"
                  type="time"
                  value={departAfter}
                  onChange={(e) => setDepartAfter(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="student-arrive"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Target Arrival Time
                </label>
                <input
                  id="student-arrive"
                  type="time"
                  value={targetArrival}
                  onChange={(e) => setTargetArrival(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Verification Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold text-slate-500">
                Test Scenarios:
              </span>
              <button
                type="button"
                onClick={() => applyPreset('s1', 's10', '07:00', '08:15')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Direct Route (Kerehalli → GPUC)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('s1', 's12', '07:00', '08:30')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Transfer Route (Kerehalli → High School)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('s3', 's10', '07:00', '08:15')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Bypass Closed Road (Bettadapur Cross → GPUC)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('s7', 's11', '07:00', '08:15')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Stale Record Warning (Nallur → Polytechnic)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('s4', 's10', '07:00', '08:30')}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cut-off Stop (Tank Bund → GPUC)
              </button>
            </div>
          </div>

          {/* Results + Map Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Ranked Safe Journeys ({searchResult.options.length})
                </h2>
                <span className="text-xs text-slate-500">
                  Dijkstra · Operational &amp; open roads only
                </span>
              </div>

              {searchResult.options.length === 0 && searchResult.infeasibility ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                    <div>
                      <h3 className="text-sm font-bold">
                        No Safe Operational Route Found
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-red-900">
                        {searchResult.infeasibility.explanation}
                      </p>

                      {searchResult.infeasibility.closedRoads.length > 0 && (
                        <div className="mt-3 border-t border-red-200 pt-3">
                          <p className="text-xs font-semibold text-red-950">
                            Active Road Closures:
                          </p>
                          <ul className="mt-1 space-y-1 text-xs text-red-900">
                            {searchResult.infeasibility.closedRoads.map((r) => (
                              <li key={r.name}>
                                {r.name} — {r.reason ?? 'Closed by Admin'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {searchResult.infeasibility.unavailableBuses.length > 0 && (
                        <div className="mt-3 border-t border-red-200 pt-3">
                          <p className="text-xs font-semibold text-red-950">
                            Excluded Unavailable Buses:
                          </p>
                          <ul className="mt-1 space-y-1 text-xs text-red-900">
                            {searchResult.infeasibility.unavailableBuses.map((b) => (
                              <li key={b.code}>
                                <span className="font-mono font-semibold">{b.code}</span>{' '}
                                ({b.routeName}) — {b.note ?? 'Unavailable'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResult.options.map((opt, idx) => {
                    const isSelected = activeJourney?.id === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedJourneyId(opt.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedJourneyId(opt.id);
                          }
                        }}
                        className={`cursor-pointer rounded-xl border bg-white p-4 transition-colors ${
                          isSelected
                            ? 'border-blue-700 ring-1 ring-blue-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="font-bold text-slate-900">
                              Option {idx + 1}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {opt.transfers === 0
                                ? 'Direct Journey'
                                : `${opt.transfers} Transfer${opt.transfers > 1 ? 's' : ''}`}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {opt.totalTravelMinutes} min total
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {opt.meetsTargetArrival ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                On Time
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <Clock className="h-3.5 w-3.5" />
                                Arrives after target
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-baseline gap-2 font-mono text-lg font-bold text-slate-900 tabular-nums">
                          <span>{formatMinutesToHHMM(opt.departureTimeMin)}</span>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <span>{formatMinutesToHHMM(opt.arrivalTimeMin)}</span>
                        </div>

                        {opt.hasStaleData && (
                          <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                            Stale bus record included (&gt;30 min old). Confirm locally at the stop.
                          </div>
                        )}

                        {/* Route Legs */}
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          {opt.legs.map((leg, legIdx) => {
                            const boardStop = stopMap.get(leg.boardStopId);
                            const alightStop = stopMap.get(leg.alightStopId);
                            return (
                              <div
                                key={`${leg.busId}-${legIdx}`}
                                className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                    <span className="font-mono text-blue-700">
                                      {leg.busCode}
                                    </span>
                                    <span>{leg.routeName}</span>
                                  </div>
                                  <p className="text-slate-600">
                                    Board {boardStop?.name} (
                                    <span className="font-mono tabular-nums">
                                      {formatMinutesToHHMM(leg.boardTimeMin)}
                                    </span>
                                    ) → Alight {alightStop?.name} (
                                    <span className="font-mono tabular-nums">
                                      {formatMinutesToHHMM(leg.alightTimeMin)}
                                    </span>
                                    )
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600 shrink-0">
                                  <span
                                    className={
                                      leg.isStale
                                        ? 'font-semibold text-amber-700'
                                        : 'text-emerald-700'
                                    }
                                  >
                                    {leg.isStale
                                      ? `STALE (${leg.ageMinutes}m ago)`
                                      : `Fresh (${leg.ageMinutes}m ago)`}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="uppercase">{leg.dataTag}</span>
                                  {leg.status === 'delayed' && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-semibold text-amber-700">
                                        +{leg.delayMinutes}m delay
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchResult.excludedNotices.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">
                    Excluded from ranking:{' '}
                  </span>
                  {searchResult.excludedNotices.join(' ')}
                </div>
              )}
            </div>

            {/* Interactive Corridor Map */}
            <div className="xl:col-span-6">
              <CorridorMap
                stops={stops}
                roads={roads}
                buses={buses}
                highlightedJourney={activeJourney}
                selectedOriginId={originStopId}
                selectedDestinationId={destinationStopId}
              />
            </div>
          </div>
        </div>
      )}

      {subMode === 'rescue' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">
              Missed Bus Rescue
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Evaluates last-known bus position, staleness, and authorized stops. When records are stale (&gt;30 min) or timing is uncertain, ROUTELESS suppresses live ETA claims and offers safe alternative routes.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label
                  htmlFor="rescue-stop"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Your Current Stop
                </label>
                <select
                  id="rescue-stop"
                  value={rescueStopId}
                  onChange={(e) => setRescueStopId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  {stops
                    .filter((s) => !s.isEducationalDestination)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rescue-bus"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Bus Missed / Checking
                </label>
                <select
                  id="rescue-bus"
                  value={missedBusId}
                  onChange={(e) => setMissedBusId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.routeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rescue-dest"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Destination Campus
                </label>
                <select
                  id="rescue-dest"
                  value={rescueDestId}
                  onChange={(e) => setRescueDestId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  {stops
                    .filter((s) => s.isEducationalDestination)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rescue-time"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Current Time
                </label>
                <input
                  id="rescue-time"
                  type="time"
                  value={rescueTime}
                  onChange={(e) => setRescueTime(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {rescueResult && (
            <div className="space-y-4">
              <div
                className={`rounded-xl border p-5 ${
                  rescueResult.timingUncertain
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {rescueResult.timingUncertain ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  ) : (
                    <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="font-mono">{rescueResult.missedBus.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Last update: {rescueResult.ageMinutes}m ago (
                        {rescueResult.isStale ? 'STALE > 30m' : 'Fresh'})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Last known stop:{' '}
                        {stopMap.get(rescueResult.missedBus.currentStopId)?.name}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-relaxed">
                      {rescueResult.warningMessage}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Alternative Safe Routes From{' '}
                  {stopMap.get(rescueStopId)?.name}
                </h3>
                {rescueResult.alternativeSearch.options.length === 0 ? (
                  <p className="mt-2 text-sm text-red-700">
                    {rescueResult.alternativeSearch.infeasibility?.explanation ??
                      'No safe alternative journeys depart after this time.'}
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {rescueResult.alternativeSearch.options.map((alt) => (
                      <div
                        key={alt.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                            {formatMinutesToHHMM(alt.departureTimeMin)} →{' '}
                            {formatMinutesToHHMM(alt.arrivalTimeMin)} (
                            {alt.totalTravelMinutes} min ·{' '}
                            {alt.transfers === 0
                              ? 'Direct'
                              : `${alt.transfers} transfer`}
                            )
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {alt.legs
                              .map(
                                (l) =>
                                  `${l.busCode} (${stopMap.get(l.boardStopId)?.name} → ${
                                    stopMap.get(l.alightStopId)?.name
                                  })`
                              )
                              .join(' then ')}
                          </p>
                        </div>
                        <div className="text-xs font-mono text-slate-600">
                          {alt.hasStaleData ? (
                            <span className="font-semibold text-amber-700">
                              Contains stale schedule
                            </span>
                          ) : (
                            <span className="text-emerald-700">Recently confirmed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {subMode === 'fleet' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Demo Fleet Status, Stops &amp; Timetables
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Driver license numbers and personal verification documents are hidden in Student view. Records older than 30 minutes are marked STALE.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Bus &amp; Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Known Stop</th>
                  <th className="px-4 py-3">Schedule (Stops)</th>
                  <th className="px-4 py-3 text-right">Load / Cap</th>
                  <th className="px-4 py-3 text-right">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buses.map((bus) => {
                  const stale = isBusStale(bus);
                  const currentStop = stopMap.get(bus.currentStopId);
                  return (
                    <tr key={bus.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-2">
                          <BusIcon className="h-4 w-4 shrink-0 text-slate-500" />
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {bus.code}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-slate-700">
                          {bus.routeName}
                        </p>
                        {bus.statusNote && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {bus.statusNote}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {bus.status === 'available' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Available
                          </span>
                        )}
                        {bus.status === 'delayed' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            Delayed (+{bus.delayMinutes}m)
                          </span>
                        )}
                        {bus.status === 'unavailable' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top text-xs text-slate-700">
                        {currentStop?.name ?? bus.currentStopId}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600">
                          {bus.schedule.map((item, i) => (
                            <span key={item.stopId}>
                              {stopMap.get(item.stopId)?.name}{' '}
                              <span className="font-mono text-slate-900 tabular-nums">
                                ({item.departureTime})
                              </span>
                              {i < bus.schedule.length - 1 ? ' →' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {bus.occupiedSeats} / {bus.capacity}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <div
                          className={
                            stale
                              ? 'font-semibold text-amber-700'
                              : 'text-slate-700'
                          }
                        >
                          {stale
                            ? `STALE (${formatAgeLabel(bus.lastUpdatedAt)})`
                            : formatAgeLabel(bus.lastUpdatedAt)}
                        </div>
                        <div className="text-[11px] uppercase text-slate-400">
                          {bus.dataTag}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
