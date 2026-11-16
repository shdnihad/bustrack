import {
  Bus,
  Driver,
  InfeasibilityDetail,
  JourneyLeg,
  JourneyOption,
  MissedBusRescueResult,
  RoadSegment,
  RouteSearchResult,
  Stop,
} from '../types/routeless';

export const STALE_THRESHOLD_MINUTES = 30;
const TRANSFER_BUFFER_MINUTES = 3;

export function parseTimeToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatMinutesToHHMM(totalMins: number): string {
  const normalized = ((Math.round(totalMins) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getAgeMinutes(isoString: string, nowMs = Date.now()): number {
  const diff = Math.max(0, nowMs - new Date(isoString).getTime());
  return Math.round(diff / 60_000);
}

export function isBusStale(bus: Bus, nowMs = Date.now()): boolean {
  return getAgeMinutes(bus.lastUpdatedAt, nowMs) > STALE_THRESHOLD_MINUTES;
}

export function formatAgeLabel(isoString: string, nowMs = Date.now()): string {
  const mins = getAgeMinutes(isoString, nowMs);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h ago` : `${hrs}h ${rem}m ago`;
}

export function findRoadSegment(
  a: string,
  b: string,
  roads: RoadSegment[]
): RoadSegment | undefined {
  return roads.find(
    (r) =>
      (r.fromStopId === a && r.toStopId === b) ||
      (r.fromStopId === b && r.toStopId === a)
  );
}

export function isRoadOpen(a: string, b: string, roads: RoadSegment[]): boolean {
  const seg = findRoadSegment(a, b, roads);
  if (!seg) return false;
  return !seg.isClosed;
}

interface SearchOptions {
  originStopId: string;
  destinationStopId: string;
  earliestDepartureMin: number;
  targetArrivalMin?: number;
  buses: Bus[];
  roads: RoadSegment[];
  drivers?: Driver[];
  nowMs?: number;
  requireSeats?: number;
  remainingSeatsByBus?: Record<string, number>;
  requireApprovedDriver?: boolean;
}

interface DijkstraState {
  key: string;
  stopId: string;
  arrivalTimeMin: number;
  departureTimeMin: number;
  transfers: number;
  stalePenalty: number;
  delayPenalty: number;
  legs: JourneyLeg[];
  visitedStops: string[];
}

function compareJourneyRank(a: JourneyOption, b: JourneyOption): number {
  // 1. Safe & operational only is enforced before creating options
  // 2. Meets requested arrival time
  if (a.meetsTargetArrival !== b.meetsTargetArrival) {
    return a.meetsTargetArrival ? -1 : 1;
  }
  // 3. Shorter total travel time (and earlier arrival)
  if (a.totalTravelMinutes !== b.totalTravelMinutes) {
    return a.totalTravelMinutes - b.totalTravelMinutes;
  }
  if (a.arrivalTimeMin !== b.arrivalTimeMin) {
    return a.arrivalTimeMin - b.arrivalTimeMin;
  }
  // 4. Fewer transfers
  if (a.transfers !== b.transfers) {
    return a.transfers - b.transfers;
  }
  // 5. More reliable and recently confirmed bus information (higher reliabilityScore is better)
  return b.reliabilityScore - a.reliabilityScore;
}

function computeReliabilityScore(legs: JourneyLeg[]): number {
  let score = 100;
  for (const leg of legs) {
    if (leg.isStale) score -= 35;
    if (leg.status === 'delayed') score -= 12 + Math.min(15, leg.delayMinutes);
    score -= Math.min(10, Math.floor(leg.ageMinutes / 10));
  }
  return Math.max(5, score);
}

export function findJourneys(params: SearchOptions): RouteSearchResult {
  const {
    originStopId,
    destinationStopId,
    earliestDepartureMin,
    targetArrivalMin,
    buses,
    roads,
    drivers,
    nowMs = Date.now(),
    requireSeats = 0,
    remainingSeatsByBus,
    requireApprovedDriver = false,
  } = params;

  const excludedNotices: string[] = [];

  if (originStopId === destinationStopId) {
    return {
      options: [],
      excludedNotices: [],
      infeasibility: {
        unavailableBuses: [],
        closedRoads: [],
        explanation: 'Origin and destination stops are identical.',
      },
    };
  }

  // Filter operational buses
  const operationalBuses = buses.filter((bus) => {
    if (bus.status === 'unavailable') {
      excludedNotices.push(
        `${bus.code} (${bus.routeName}) excluded: bus marked unavailable.`
      );
      return false;
    }
    if (requireApprovedDriver && drivers) {
      const driver = drivers.find((d) => d.id === bus.driverId);
      if (!driver || driver.verificationStatus !== 'approved') {
        excludedNotices.push(
          `${bus.code} excluded: assigned driver is not approved.`
        );
        return false;
      }
    }
    if (requireSeats > 0) {
      const spare = remainingSeatsByBus
        ? (remainingSeatsByBus[bus.id] ?? 0)
        : Math.max(0, bus.capacity - bus.occupiedSeats);
      if (spare < requireSeats) {
        return false;
      }
    }
    return true;
  });

  // Dijkstra priority queue over transit graph states
  const queue: DijkstraState[] = [
    {
      key: `${originStopId}:start`,
      stopId: originStopId,
      arrivalTimeMin: earliestDepartureMin,
      departureTimeMin: earliestDepartureMin,
      transfers: 0,
      stalePenalty: 0,
      delayPenalty: 0,
      legs: [],
      visitedStops: [originStopId],
    },
  ];

  // Track best arrival time per (stopId, transfers) to prune dominated states while preserving transfer alternatives
  const bestSeen = new Map<string, number>();
  const rawSolutions: JourneyOption[] = [];

  const stateCost = (s: DijkstraState): number => {
    const travel = s.legs.length === 0 ? 0 : s.arrivalTimeMin - s.departureTimeMin;
    return travel * 100 + s.transfers * 400 + s.stalePenalty * 80 + s.delayPenalty * 20;
  };

  while (queue.length > 0) {
    queue.sort((a, b) => stateCost(a) - stateCost(b));
    const current = queue.shift()!;

    if (current.stopId === destinationStopId && current.legs.length > 0) {
      const arrivalTimeMin = current.arrivalTimeMin;
      const departureTimeMin = current.departureTimeMin;
      const transfers = Math.max(0, current.legs.length - 1);
      const meetsTargetArrival =
        targetArrivalMin === undefined ? true : arrivalTimeMin <= targetArrivalMin;

      rawSolutions.push({
        id: current.legs.map((l) => `${l.busId}:${l.boardStopId}-${l.alightStopId}`).join('|'),
        legs: current.legs,
        departureTimeMin,
        arrivalTimeMin,
        totalTravelMinutes: arrivalTimeMin - departureTimeMin,
        transfers,
        meetsTargetArrival,
        reliabilityScore: computeReliabilityScore(current.legs),
        hasStaleData: current.legs.some((l) => l.isStale),
        hasDelayedLeg: current.legs.some((l) => l.status === 'delayed'),
        transferStopIds: current.legs.slice(0, -1).map((l) => l.alightStopId),
      });
      if (rawSolutions.length >= 16) break;
      continue;
    }

    if (current.legs.length >= 3) continue; // cap at max 2 transfers (3 legs)

    const minBoardMin =
      current.legs.length === 0
        ? earliestDepartureMin
        : current.arrivalTimeMin + TRANSFER_BUFFER_MINUTES;

    for (const bus of operationalBuses) {
      // Avoid re-boarding the same bus consecutively
      if (current.legs.some((l) => l.busId === bus.id)) continue;

      const delayOffset = bus.status === 'delayed' ? bus.delayMinutes : 0;
      const boardIdx = bus.schedule.findIndex((s) => s.stopId === current.stopId);
      if (boardIdx === -1 || boardIdx === bus.schedule.length - 1) continue;

      const boardTimeMin =
        parseTimeToMinutes(bus.schedule[boardIdx].departureTime) + delayOffset;
      if (boardTimeMin < minBoardMin) continue;

      // Walk along subsequent stops on this bus while roads remain open
      const intermediateStopIds: string[] = [];
      for (let i = boardIdx + 1; i < bus.schedule.length; i++) {
        const prevStop = bus.schedule[i - 1].stopId;
        const nextStop = bus.schedule[i].stopId;

        if (!isRoadOpen(prevStop, nextStop, roads)) {
          // Bus cannot traverse closed road segment
          break;
        }

        if (current.visitedStops.includes(nextStop)) {
          intermediateStopIds.push(nextStop);
          continue;
        }

        const alightTimeMin =
          parseTimeToMinutes(bus.schedule[i].departureTime) + delayOffset;
        const ageMinutes = getAgeMinutes(bus.lastUpdatedAt, nowMs);
        const stale = ageMinutes > STALE_THRESHOLD_MINUTES;

        const leg: JourneyLeg = {
          busId: bus.id,
          busCode: bus.code,
          routeName: bus.routeName,
          status: bus.status,
          delayMinutes: delayOffset,
          isStale: stale,
          ageMinutes,
          boardStopId: current.stopId,
          alightStopId: nextStop,
          boardTimeMin,
          alightTimeMin,
          intermediateStopIds: [...intermediateStopIds],
          dataTag: bus.dataTag,
        };

        const nextLegs = [...current.legs, leg];
        const nextTransfers = Math.max(0, nextLegs.length - 1);
        const nextDep = current.legs.length === 0 ? boardTimeMin : current.departureTimeMin;
        const pruneKey = `${nextStop}:${nextTransfers}:${bus.id}`;
        const prevBest = bestSeen.get(pruneKey);
        if (prevBest !== undefined && prevBest <= alightTimeMin) {
          intermediateStopIds.push(nextStop);
          continue;
        }
        bestSeen.set(pruneKey, alightTimeMin);

        queue.push({
          key: pruneKey,
          stopId: nextStop,
          arrivalTimeMin: alightTimeMin,
          departureTimeMin: nextDep,
          transfers: nextTransfers,
          stalePenalty: current.stalePenalty + (stale ? 1 : 0),
          delayPenalty: current.delayPenalty + (bus.status === 'delayed' ? 1 : 0),
          legs: nextLegs,
          visitedStops: [...current.visitedStops, nextStop],
        });

        intermediateStopIds.push(nextStop);
      }
    }
  }

  // Deduplicate identical leg sequences and sort by strict ranking rules
  const dedupedMap = new Map<string, JourneyOption>();
  for (const sol of rawSolutions) {
    const existing = dedupedMap.get(sol.id);
    if (!existing || compareJourneyRank(sol, existing) < 0) {
      dedupedMap.set(sol.id, sol);
    }
  }

  const options = Array.from(dedupedMap.values()).sort(compareJourneyRank).slice(0, 5);

  if (options.length === 0) {
    const unavailableBuses = buses
      .filter((b) => b.status === 'unavailable')
      .map((b) => ({ code: b.code, routeName: b.routeName, note: b.statusNote }));
    const closedRoads = roads
      .filter((r) => r.isClosed)
      .map((r) => ({ name: r.name, reason: r.closureReason }));

    const reasons: string[] = [];
    if (closedRoads.length > 0) {
      reasons.push(
        `Closed road segment(s): ${closedRoads.map((r) => r.name).join(', ')}.`
      );
    }
    if (unavailableBuses.length > 0) {
      reasons.push(
        `Unavailable bus(es): ${unavailableBuses.map((b) => b.code).join(', ')}.`
      );
    }
    if (reasons.length === 0) {
      reasons.push(
        `No scheduled operational bus connections depart after ${formatMinutesToHHMM(
          earliestDepartureMin
        )} along open roads to reach this destination.`
      );
    }

    return {
      options: [],
      excludedNotices,
      infeasibility: {
        unavailableBuses,
        closedRoads,
        explanation: reasons.join(' '),
      },
    };
  }

  return {
    options,
    excludedNotices,
  };
}

export function evaluateMissedBusRescue(params: {
  stopId: string;
  missedBusId: string;
  destinationStopId: string;
  currentTimeMin: number;
  buses: Bus[];
  roads: RoadSegment[];
  stops: Stop[];
  nowMs?: number;
}): MissedBusRescueResult | null {
  const {
    stopId,
    missedBusId,
    destinationStopId,
    currentTimeMin,
    buses,
    roads,
    stops,
    nowMs = Date.now(),
  } = params;

  const missedBus = buses.find((b) => b.id === missedBusId);
  if (!missedBus) return null;

  const ageMinutes = getAgeMinutes(missedBus.lastUpdatedAt, nowMs);
  const stale = ageMinutes > STALE_THRESHOLD_MINUTES;
  const stopIdx = missedBus.schedule.findIndex((s) => s.stopId === stopId);
  const scheduledAtStop =
    stopIdx >= 0
      ? parseTimeToMinutes(missedBus.schedule[stopIdx].departureTime) +
        (missedBus.status === 'delayed' ? missedBus.delayMinutes : 0)
      : undefined;

  const currentKnownStop =
    stops.find((s) => s.id === missedBus.currentStopId)?.name ?? missedBus.currentStopId;

  const alternativeSearch = findJourneys({
    originStopId: stopId,
    destinationStopId,
    earliestDepartureMin: currentTimeMin,
    buses,
    roads,
    nowMs,
  });

  if (missedBus.status === 'unavailable') {
    return {
      missedBus,
      isStale: stale,
      ageMinutes,
      timingUncertain: true,
      warningMessage: `${missedBus.code} is marked unavailable (${missedBus.statusNote ?? 'service suspended'}). Do not wait at this stop.`,
      canInterceptLater: false,
      alternativeSearch,
    };
  }

  if (stale) {
    return {
      missedBus,
      isStale: true,
      ageMinutes,
      timingUncertain: true,
      warningMessage: `Last-known position for ${missedBus.code} (${currentKnownStop}) is stale (${ageMinutes}m old). Timing is uncertain — no live ETA is shown. Choose an alternative route below.`,
      canInterceptLater: false,
      alternativeSearch,
    };
  }

  // Bus telemetry is fresh; check if it hasn't actually reached the stop yet (e.g., delayed)
  if (scheduledAtStop !== undefined && scheduledAtStop >= currentTimeMin) {
    const minsUntil = scheduledAtStop - currentTimeMin;
    return {
      missedBus,
      isStale: false,
      ageMinutes,
      timingUncertain: false,
      warningMessage: `Based on last-known schedule confirmed ${ageMinutes}m ago at ${currentKnownStop}, ${missedBus.code} is estimated to depart this stop around ${formatMinutesToHHMM(
        scheduledAtStop
      )} (${minsUntil} min from ${formatMinutesToHHMM(currentTimeMin)}). This is a simulated schedule estimate, not live GPS.`,
      canInterceptLater: true,
      interceptMessage: `Remain at stop for ${missedBus.code} (~${formatMinutesToHHMM(
        scheduledAtStop
      )}) or take a backup option below.`,
      alternativeSearch,
    };
  }

  return {
    missedBus,
    isStale: false,
    ageMinutes,
    timingUncertain: false,
    warningMessage: `${missedBus.code} already passed its scheduled departure (${
      scheduledAtStop ? formatMinutesToHHMM(scheduledAtStop) : 'earlier'
    }; last confirmed ${ageMinutes}m ago at ${currentKnownStop}). Use an alternative connection below.`,
    canInterceptLater: false,
    alternativeSearch,
  };
}
