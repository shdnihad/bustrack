import {
  Bus,
  BusCapacitySnapshot,
  CrisisAllocationOutcome,
  CrisisAllocationResult,
  Driver,
  RoadSegment,
  StudentCrisisRequest,
} from '../types/routeless';
import { findJourneys, parseTimeToMinutes } from './routing';

export function runCrisisReallocation(params: {
  buses: Bus[];
  drivers: Driver[];
  roads: RoadSegment[];
  requests: StudentCrisisRequest[];
  nowMs?: number;
}): CrisisAllocationResult {
  const { buses, drivers, roads, requests, nowMs = Date.now() } = params;

  const remainingSeatsByBus: Record<string, number> = {};
  const crisisAllocatedByBus: Record<string, number> = {};
  const excludedReasonByBus: Record<string, string | undefined> = {};

  for (const bus of buses) {
    crisisAllocatedByBus[bus.id] = 0;
    const driver = drivers.find((d) => d.id === bus.driverId);

    if (bus.status === 'unavailable') {
      remainingSeatsByBus[bus.id] = 0;
      excludedReasonByBus[bus.id] = 'Bus unavailable';
    } else if (!driver || driver.verificationStatus !== 'approved') {
      remainingSeatsByBus[bus.id] = 0;
      excludedReasonByBus[bus.id] = `Driver ${
        driver ? driver.verificationStatus : 'missing'
      }`;
    } else {
      remainingSeatsByBus[bus.id] = Math.max(0, bus.capacity - bus.occupiedSeats);
    }
  }

  // Rank requests by:
  // 1. Has examination deadline
  // 2. Earliest examination deadline
  // 3. Earliest request time
  const sortedRequests = [...requests].sort((a, b) => {
    const aHasExam = Boolean(a.examDeadline);
    const bHasExam = Boolean(b.examDeadline);
    if (aHasExam !== bHasExam) {
      return aHasExam ? -1 : 1;
    }
    if (a.examDeadline && b.examDeadline) {
      const diff = parseTimeToMinutes(a.examDeadline) - parseTimeToMinutes(b.examDeadline);
      if (diff !== 0) return diff;
    }
    return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
  });

  const outcomes: CrisisAllocationOutcome[] = [];

  sortedRequests.forEach((request, index) => {
    const targetArrivalMin = request.examDeadline
      ? parseTimeToMinutes(request.examDeadline)
      : undefined;

    // 1. Search with strict remaining capacity
    const feasibleWithCapacity = findJourneys({
      originStopId: request.originStopId,
      destinationStopId: request.destinationStopId,
      earliestDepartureMin: parseTimeToMinutes('06:45'),
      targetArrivalMin,
      buses,
      roads,
      drivers,
      nowMs,
      requireSeats: request.seatCount,
      remainingSeatsByBus,
      requireApprovedDriver: true,
    });

    if (feasibleWithCapacity.options.length > 0) {
      // Pick top-ranked feasible itinerary (meets deadline, shortest travel, fewest transfers)
      const chosen = feasibleWithCapacity.options[0];

      // Strictly decrement remaining seats across every leg's bus
      for (const leg of chosen.legs) {
        remainingSeatsByBus[leg.busId] = Math.max(
          0,
          (remainingSeatsByBus[leg.busId] ?? 0) - request.seatCount
        );
        crisisAllocatedByBus[leg.busId] =
          (crisisAllocatedByBus[leg.busId] ?? 0) + request.seatCount;
      }

      outcomes.push({
        request,
        rankIndex: index + 1,
        allocated: true,
        journey: chosen,
      });
      return;
    }

    // 2. Capacity-unconstrained check to diagnose exact reason for non-allocation
    const feasibleIgnoringCapacity = findJourneys({
      originStopId: request.originStopId,
      destinationStopId: request.destinationStopId,
      earliestDepartureMin: parseTimeToMinutes('06:45'),
      targetArrivalMin,
      buses,
      roads,
      drivers,
      nowMs,
      requireSeats: 0,
      requireApprovedDriver: true,
    });

    const unassignedReason =
      feasibleIgnoringCapacity.options.length > 0
        ? 'Remaining capacity is insufficient on all safe routes'
        : 'No safe route (road closed or no operational authorized bus serves this corridor)';

    outcomes.push({
      request,
      rankIndex: index + 1,
      allocated: false,
      unassignedReason,
    });
  });

  const busSnapshots: BusCapacitySnapshot[] = buses.map((bus) => ({
    busId: bus.id,
    busCode: bus.code,
    routeName: bus.routeName,
    totalCapacity: bus.capacity,
    baselineOccupied: bus.occupiedSeats,
    crisisAllocated: crisisAllocatedByBus[bus.id] ?? 0,
    remainingSeats: remainingSeatsByBus[bus.id] ?? 0,
    excludedReason: excludedReasonByBus[bus.id],
  }));

  const assignedCount = outcomes.filter((o) => o.allocated).length;
  const examRequests = outcomes.filter((o) => Boolean(o.request.examDeadline));

  return {
    methodLabel:
      'Deterministic Priority-Greedy Heuristic (Exam Deadline → Request Time; Capacity-Strict Dijkstra)',
    ranAt: new Date(nowMs).toISOString(),
    outcomes,
    busSnapshots,
    summary: {
      totalRequests: outcomes.length,
      totalSeatsRequested: requests.reduce((acc, r) => acc + r.seatCount, 0),
      assignedCount,
      unassignedCount: outcomes.length - assignedCount,
      examPriorityAssigned: examRequests.filter((o) => o.allocated).length,
      examPriorityTotal: examRequests.length,
    },
  };
}
