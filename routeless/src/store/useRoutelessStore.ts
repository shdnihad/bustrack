import { useCallback, useEffect, useState } from 'react';
import { createSeedState } from '../data/seedData';
import {
  BusStatus,
  DriverVerificationStatus,
  QueuedUpdate,
  RoutelessState,
  StudentCrisisRequest,
} from '../types/routeless';

const STORAGE_KEY = 'routeless_demo_state_v1';

function loadInitialState(): RoutelessState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RoutelessState;
      if (parsed && Array.isArray(parsed.buses) && Array.isArray(parsed.stops)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted local storage and restore demo seed
  }
  return createSeedState(Date.now());
}

export function useRoutelessStore(browserOnline: boolean) {
  const [state, setState] = useState<RoutelessState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota fallback ignored
    }
  }, [state]);

  const effectiveOffline = !browserOnline || state.simulatedOffline;

  const setSimulatedOffline = useCallback((offline: boolean) => {
    setState((prev) => ({ ...prev, simulatedOffline: offline }));
  }, []);

  const setActiveDriverId = useCallback((driverId: string) => {
    setState((prev) => ({ ...prev, activeDriverId: driverId }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createSeedState(Date.now());
    setState(fresh);
  }, []);

  const applyDriverBusUpdate = useCallback(
    (params: {
      driverId: string;
      busId: string;
      updateType: 'status' | 'gps_step' | 'occupancy';
      summary: string;
      payload: QueuedUpdate['payload'];
      idempotencyKey?: string;
    }): { ok: boolean; mode: 'applied' | 'queued' | 'rejected'; message: string } => {
      const driver = state.drivers.find((d) => d.id === params.driverId);
      if (!driver) {
        return { ok: false, mode: 'rejected', message: 'Driver record not found.' };
      }
      if (driver.verificationStatus !== 'approved') {
        return {
          ok: false,
          mode: 'rejected',
          message: `Authorization blocked: driver status is ${driver.verificationStatus}.`,
        };
      }
      if (driver.assignedBusId !== params.busId) {
        return {
          ok: false,
          mode: 'rejected',
          message: 'Permission denied: you can only update your assigned bus.',
        };
      }

      const nowIso = new Date().toISOString();
      const key =
        params.idempotencyKey ??
        `${params.driverId}:${params.busId}:${params.updateType}:${nowIso}`;

      if (effectiveOffline) {
        setState((prev) => {
          // Deduplicate queued items with identical idempotencyKey
          if (prev.syncQueue.some((q) => q.idempotencyKey === key)) {
            return prev;
          }
          const queuedItem: QueuedUpdate = {
            id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            idempotencyKey: key,
            driverId: params.driverId,
            busId: params.busId,
            updateType: params.updateType,
            summary: params.summary,
            payload: params.payload,
            createdAt: nowIso,
            syncState: 'queued',
          };
          return {
            ...prev,
            syncQueue: [...prev.syncQueue, queuedItem],
          };
        });

        return {
          ok: true,
          mode: 'queued',
          message:
            'Saved locally in offline sync queue. Not yet transmitted to students or dispatch.',
        };
      }

      // Online: apply immediately with fresh timestamp and record synced log
      setState((prev) => {
        const updatedBuses = prev.buses.map((bus) => {
          if (bus.id !== params.busId) return bus;
          return {
            ...bus,
            ...params.payload,
            lastUpdatedAt: nowIso,
            dataTag: 'simulated' as const,
          };
        });

        const syncedEntry: QueuedUpdate = {
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          idempotencyKey: key,
          driverId: params.driverId,
          busId: params.busId,
          updateType: params.updateType,
          summary: params.summary,
          payload: params.payload,
          createdAt: nowIso,
          syncedAt: nowIso,
          syncState: 'synced',
        };

        return {
          ...prev,
          buses: updatedBuses,
          syncQueue: [...prev.syncQueue, syncedEntry],
          lastSyncedAt: nowIso,
        };
      });

      return {
        ok: true,
        mode: 'applied',
        message: 'Simulated bus update applied and timestamped.',
      };
    },
    [effectiveOffline, state.drivers]
  );

  const syncPendingQueue = useCallback((): {
    syncedCount: number;
    duplicateCount: number;
  } => {
    if (effectiveOffline) {
      return { syncedCount: 0, duplicateCount: 0 };
    }

    let syncedCount = 0;
    let duplicateCount = 0;
    const syncIso = new Date().toISOString();

    setState((prev) => {
      const pending = prev.syncQueue
        .filter((item) => item.syncState === 'queued')
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      if (pending.length === 0) return prev;

      const seenKeys = new Set(
        prev.syncQueue
          .filter((item) => item.syncState === 'synced')
          .map((item) => item.idempotencyKey)
      );

      let nextBuses = [...prev.buses];
      const processedIds = new Map<string, 'synced' | 'duplicate_ignored'>();

      for (const item of pending) {
        if (seenKeys.has(item.idempotencyKey)) {
          processedIds.set(item.id, 'duplicate_ignored');
          duplicateCount++;
          continue;
        }
        seenKeys.add(item.idempotencyKey);
        processedIds.set(item.id, 'synced');
        syncedCount++;

        nextBuses = nextBuses.map((bus) => {
          if (bus.id !== item.busId) return bus;
          // Preserve original event timestamp when replaying offline queue
          return {
            ...bus,
            ...item.payload,
            lastUpdatedAt: item.createdAt,
            dataTag: 'simulated',
          };
        });
      }

      const nextQueue = prev.syncQueue.map((item) => {
        const nextState = processedIds.get(item.id);
        if (!nextState) return item;
        return {
          ...item,
          syncState: nextState,
          syncedAt: syncIso,
        };
      });

      return {
        ...prev,
        buses: nextBuses,
        syncQueue: nextQueue,
        lastSyncedAt: syncIso,
      };
    });

    return { syncedCount, duplicateCount };
  }, [effectiveOffline]);

  const setDriverVerification = useCallback(
    (driverId: string, status: DriverVerificationStatus, note?: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        drivers: prev.drivers.map((d) =>
          d.id === driverId
            ? {
                ...d,
                verificationStatus: status,
                rejectionOrPendingNote: note ?? d.rejectionOrPendingNote,
                updatedAt: nowIso,
              }
            : d
        ),
        lastSyncedAt: effectiveOffline ? prev.lastSyncedAt : nowIso,
      }));
    },
    [effectiveOffline]
  );

  const adminUpdateBus = useCallback(
    (
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
    ) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        buses: prev.buses.map((b) =>
          b.id === busId
            ? {
                ...b,
                ...patch,
                lastUpdatedAt: patch.lastUpdatedAt ?? nowIso,
                dataTag: 'simulated',
              }
            : b
        ),
        lastSyncedAt: effectiveOffline ? prev.lastSyncedAt : nowIso,
      }));
    },
    [effectiveOffline]
  );

  const toggleRoadClosure = useCallback(
    (roadId: string, isClosed: boolean, reason?: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        roads: prev.roads.map((r) =>
          r.id === roadId
            ? {
                ...r,
                isClosed,
                closureReason: isClosed
                  ? reason || 'Admin emergency road closure (demo)'
                  : undefined,
                updatedAt: nowIso,
              }
            : r
        ),
        lastSyncedAt: effectiveOffline ? prev.lastSyncedAt : nowIso,
      }));
    },
    [effectiveOffline]
  );

  const addCrisisRequest = useCallback(
    (req: Omit<StudentCrisisRequest, 'id' | 'requestedAt' | 'studentCode'>) => {
      const nowIso = new Date().toISOString();
      const code = `STU-${Math.floor(1100 + Math.random() * 8900)}`;
      setState((prev) => ({
        ...prev,
        crisisRequests: [
          ...prev.crisisRequests,
          {
            ...req,
            id: `req-${Date.now()}`,
            studentCode: code,
            requestedAt: nowIso,
          },
        ],
      }));
    },
    []
  );

  const removeCrisisRequest = useCallback((requestId: string) => {
    setState((prev) => ({
      ...prev,
      crisisRequests: prev.crisisRequests.filter((r) => r.id !== requestId),
    }));
  }, []);

  return {
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
  };
}
