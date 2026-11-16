import { useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { AdminView } from './components/AdminView';
import { CrisisView } from './components/CrisisView';
import { DriverView } from './components/DriverView';
import { KioskView } from './components/KioskView';
import { NetworkSyncPanel } from './components/NetworkSyncPanel';
import { PWAInstallButton } from './components/PWAInstallButton';
import { StudentView } from './components/StudentView';
import { formatAgeLabel } from './engine/routing';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useRoutelessStore } from './store/useRoutelessStore';
import { AppRole } from './types/routeless';

const NAV_ITEMS: { id: AppRole; label: string }[] = [
  { id: 'student', label: 'Student Search' },
  { id: 'driver', label: 'Driver Console' },
  { id: 'admin', label: 'Admin & Verify' },
  { id: 'crisis', label: 'Crisis Dispatch' },
  { id: 'kiosk', label: 'Public Kiosk' },
];

export default function App() {
  const browserOnline = useOnlineStatus();
  const {
    state,
    effectiveOffline,
    setSimulatedOffline,
    setActiveDriverId,
    resetDemoData,
    applyDriverBusUpdate,
    syncPendingQueue,
    setDriverVerification,
    adminUpdateBus,
    toggleRoadClosure,
    addCrisisRequest,
    removeCrisisRequest,
  } = useRoutelessStore(browserOnline);

  const [activeRole, setActiveRole] = useState<AppRole>('student');
  const [networkPanelOpen, setNetworkPanelOpen] = useState(false);

  const pendingQueueCount = state.syncQueue.filter(
    (q) => q.syncState === 'queued'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveRole('student');
            }}
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            ROUTELESS
          </a>

          {/* Zone 2: 5 concise single-line role links */}
          <nav
            className="hidden md:flex items-center gap-6 text-sm font-medium"
            aria-label="Primary role navigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeRole === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRole(item.id)}
                  className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
                    isActive
                      ? 'border-blue-700 font-semibold text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setNetworkPanelOpen(true)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                effectiveOffline
                  ? 'bg-amber-700 text-white hover:bg-amber-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {effectiveOffline ? (
                <WifiOff className="h-3.5 w-3.5" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              Network &amp; Sync
              {pendingQueueCount > 0 ? ` (${pendingQueueCount})` : ''}
            </button>
          </div>
        </div>

        {/* Mobile Role Switcher Row */}
        <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = activeRole === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveRole(item.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Workspace Context Sub-Bar (non-sticky, clean unboxed metadata + PWA install) */}
      <div className="border-b border-slate-200 bg-slate-100/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs text-slate-600 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">
              No Network Should Mean No Missed Journey
            </span>
            <span aria-hidden="true">·</span>
            <span>Fictional Demo Dataset</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {effectiveOffline ? 'Offline Cache' : 'Local Demo Store'} (Synced{' '}
              {formatAgeLabel(state.lastSyncedAt)})
            </span>
          </div>
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Content */}
      <main id="top" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {activeRole === 'student' && (
          <StudentView
            villages={state.villages}
            stops={state.stops}
            roads={state.roads}
            buses={state.buses}
            effectiveOffline={effectiveOffline}
            lastSyncedAt={state.lastSyncedAt}
          />
        )}

        {activeRole === 'driver' && (
          <DriverView
            drivers={state.drivers}
            buses={state.buses}
            stops={state.stops}
            activeDriverId={state.activeDriverId}
            onSelectDriver={setActiveDriverId}
            effectiveOffline={effectiveOffline}
            syncQueue={state.syncQueue}
            onSubmitUpdate={applyDriverBusUpdate}
            onSyncQueue={syncPendingQueue}
          />
        )}

        {activeRole === 'admin' && (
          <AdminView
            drivers={state.drivers}
            buses={state.buses}
            roads={state.roads}
            stops={state.stops}
            onVerifyDriver={setDriverVerification}
            onUpdateBus={adminUpdateBus}
            onToggleRoad={toggleRoadClosure}
          />
        )}

        {activeRole === 'crisis' && (
          <CrisisView
            buses={state.buses}
            drivers={state.drivers}
            roads={state.roads}
            stops={state.stops}
            requests={state.crisisRequests}
            onToggleRoad={toggleRoadClosure}
            onUpdateBus={adminUpdateBus}
            onAddRequest={addCrisisRequest}
            onRemoveRequest={removeCrisisRequest}
          />
        )}

        {activeRole === 'kiosk' && (
          <KioskView
            stops={state.stops}
            roads={state.roads}
            buses={state.buses}
            lastSyncedAt={state.lastSyncedAt}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:px-6">
          <span>
            ROUTELESS Prototype · Connecting Rural Students to Education
          </span>
          <span>
            All buses, drivers, stops, and GPS events shown are fictional demonstration data.
          </span>
        </div>
      </footer>

      <NetworkSyncPanel
        open={networkPanelOpen}
        onClose={() => setNetworkPanelOpen(false)}
        browserOnline={browserOnline}
        simulatedOffline={state.simulatedOffline}
        onToggleSimulatedOffline={setSimulatedOffline}
        lastSyncedAt={state.lastSyncedAt}
        syncQueue={state.syncQueue}
        onSyncNow={syncPendingQueue}
        onResetDemo={resetDemoData}
      />
    </div>
  );
}
