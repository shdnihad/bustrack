import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { formatAgeLabel, isBusStale } from '../engine/routing';
import {
  Bus,
  BusStatus,
  Driver,
  DriverVerificationStatus,
  RoadSegment,
  Stop,
} from '../types/routeless';

interface AdminViewProps {
  drivers: Driver[];
  buses: Bus[];
  roads: RoadSegment[];
  stops: Stop[];
  onVerifyDriver: (
    driverId: string,
    status: DriverVerificationStatus,
    note?: string
  ) => void;
  onUpdateBus: (
    busId: string,
    patch: Partial<{
      status: BusStatus;
      delayMinutes: number;
      capacity: number;
      occupiedSeats: number;
      driverId: string;
      statusNote: string;
      lastUpdatedAt: string;
    }>
  ) => void;
  onToggleRoad: (roadId: string, isClosed: boolean, reason?: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  drivers,
  buses,
  roads,
  stops,
  onVerifyDriver,
  onUpdateBus,
  onToggleRoad,
}) => {
  const [tab, setTab] = useState<'drivers' | 'fleet' | 'integrations'>('drivers');
  const stopMap = new Map(stops.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Admin Operations · Restricted Driver Verification &amp; Fleet Governance
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Driver Verification &amp; Fleet Management
          </h1>
        </div>

        <div
          className="inline-flex rounded-lg bg-slate-100 p-1"
          role="tablist"
          aria-label="Admin workspace sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'drivers'}
            onClick={() => setTab('drivers')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              tab === 'drivers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Driver Verification ({drivers.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'fleet'}
            onClick={() => setTab('fleet')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              tab === 'fleet'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buses &amp; Roads ({buses.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'integrations'}
            onClick={() => setTab('integrations')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              tab === 'integrations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phase 3 &amp; Limitations
          </button>
        </div>
      </div>

      {tab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <Lock className="h-4 w-4 shrink-0 text-slate-600" />
            <span>
              <strong>Privacy Boundary:</strong> Fictional demo license numbers and submitted verification documents below are restricted exclusively to this Admin view and never exposed to Student or Kiosk views.
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Demo Driver</th>
                    <th className="px-4 py-3">Assigned Bus</th>
                    <th className="px-4 py-3">License &amp; Document (Admin Only)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drivers.map((driver) => {
                    const bus = buses.find((b) => b.id === driver.assignedBusId);
                    return (
                      <tr key={driver.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-semibold text-slate-900">
                            {driver.name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {driver.phoneMasked}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {bus?.code ?? driver.assignedBusId}
                          </span>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {bus?.routeName}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-mono text-xs text-slate-800">
                            {driver.licenseNumber}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <FileText className="h-3.5 w-3.5" />
                            {driver.submittedDocument}
                          </p>
                          {driver.rejectionOrPendingNote && (
                            <p className="mt-1 text-xs text-slate-600">
                              {driver.rejectionOrPendingNote}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {driver.verificationStatus === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <ShieldCheck className="h-4 w-4" />
                              Approved
                            </span>
                          )}
                          {driver.verificationStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                              <Clock className="h-4 w-4" />
                              Pending Review
                            </span>
                          )}
                          {driver.verificationStatus === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                              <XCircle className="h-4 w-4" />
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={driver.verificationStatus === 'approved'}
                              onClick={() =>
                                onVerifyDriver(
                                  driver.id,
                                  'approved',
                                  'Approved in Admin demo console'
                                )
                              }
                              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={driver.verificationStatus === 'rejected'}
                              onClick={() =>
                                onVerifyDriver(
                                  driver.id,
                                  'rejected',
                                  'Verification rejected by admin'
                                )
                              }
                              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'fleet' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Buses */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden xl:col-span-7">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Fleet Capacity &amp; Freshness Controls
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Adjust bus status, capacity, or simulate stale telemetry (&gt;30 min)
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {buses.map((bus) => {
                const stale = isBusStale(bus);
                return (
                  <div
                    key={bus.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {bus.code}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {bus.routeName}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                        Cap: {bus.capacity} · Occupied: {bus.occupiedSeats} ·{' '}
                        <span className={stale ? 'font-bold text-amber-700' : ''}>
                          Updated {formatAgeLabel(bus.lastUpdatedAt)}
                          {stale ? ' (STALE)' : ''}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Status for ${bus.code}`}
                        value={bus.status}
                        onChange={(e) =>
                          onUpdateBus(bus.id, {
                            status: e.target.value as BusStatus,
                            delayMinutes: e.target.value === 'delayed' ? 10 : 0,
                          })
                        }
                        className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                      >
                        <option value="available">Available</option>
                        <option value="delayed">Delayed (+10m)</option>
                        <option value="unavailable">Unavailable</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus(bus.id, {
                            lastUpdatedAt: new Date(
                              Date.now() - 48 * 60_000
                            ).toISOString(),
                          })
                        }
                        className="h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Make Stale
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus(bus.id, {
                            lastUpdatedAt: new Date().toISOString(),
                          })
                        }
                        className="h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Confirm Fresh
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Road Segments */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden xl:col-span-5">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Road Graph Segments ({roads.length})
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Closed segments are excluded by both Student routing and Crisis allocation
              </p>
            </div>
            <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
              {roads.map((road) => (
                <div
                  key={road.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {road.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {stopMap.get(road.fromStopId)?.name} ↔{' '}
                      {stopMap.get(road.toStopId)?.name} ({road.distanceKm} km)
                    </p>
                    {road.isClosed && road.closureReason && (
                      <p className="mt-0.5 text-[11px] font-medium text-red-700">
                        {road.closureReason}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onToggleRoad(
                        road.id,
                        !road.isClosed,
                        !road.isClosed
                          ? 'Closed by Admin in Fleet Manager (demo)'
                          : undefined
                      )
                    }
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      road.isClosed
                        ? 'bg-red-700 text-white hover:bg-red-800'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {road.isClosed ? 'Reopen Road' : 'Close Road'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">
              Phase 3 Optional Integrations (Status &amp; Setup)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              This prototype is engineered to run completely without paid API keys or external servers. Below is the honest status of optional Phase 3 integrations:
            </p>
            <ul className="mt-4 divide-y divide-slate-100 text-xs">
              <li className="py-3">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Firebase Auth, Firestore &amp; Storage</span>
                  <span className="font-mono text-amber-700">SIMULATED LOCALLY</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Demo sign-in and localStorage persistence stand in for Firebase Auth/Firestore. To connect production Firebase, provision a project and wire server-side rules.
                </p>
              </li>
              <li className="py-3">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Gemini Natural-Language Route Explanations</span>
                  <span className="font-mono text-slate-600">NOT CONFIGURED</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Requires server-side <code className="font-mono">GEMINI_API_KEY</code> proxy route (<code className="font-mono">/api/*</code>). Never expose keys in client bundles.
                </p>
              </li>
              <li className="py-3">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>SMS / OTP Provider &amp; Live Browser GPS</span>
                  <span className="font-mono text-amber-700">SIMULATED</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Driver GPS uses step-by-step schedule simulation along authorized stops. Real browser geolocation suspends when mobile tabs background.
                </p>
              </li>
              <li className="py-3">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Local Kiosk-to-Driver Wi-Fi Direct</span>
                  <span className="font-mono text-slate-600">NOT IMPLEMENTED</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Browsers cannot open raw Wi-Fi Direct peer sockets without a local edge hotspot/WebRTC signaling relay.
                </p>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">
              Offline &amp; Background Sync Limitations
            </h2>
            <ul className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  <strong>No Silent Cross-Device Broadcast While Offline:</strong> Queued driver updates are stored locally in the browser and explicitly marked as not transmitted until synced.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <span>
                  <strong>PWA App Shell &amp; Saved Timetables:</strong> Configured with Vite PWA Workbox precaching so the UI and saved route graph work offline.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  <strong>Browser Background Sync Differences:</strong> Safari/iOS WebKit does not support the Background Sync API; users sync manually or on app foreground return.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
