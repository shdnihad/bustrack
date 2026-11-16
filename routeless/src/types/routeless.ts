export type AppRole = 'student' | 'driver' | 'admin' | 'crisis' | 'kiosk';

export type DataFreshnessLabel = 'demo' | 'simulated' | 'cached' | 'live';

export interface Village {
  id: string;
  name: string;
  nameKn: string;
  taluk: string;
}

export interface Stop {
  id: string;
  name: string;
  nameKn: string;
  villageId: string;
  isEducationalDestination: boolean;
  institutionType?: 'PU College' | 'Polytechnic' | 'High School';
  x: number;
  y: number;
}

export interface RoadSegment {
  id: string;
  fromStopId: string;
  toStopId: string;
  name: string;
  distanceKm: number;
  travelMinutes: number;
  isClosed: boolean;
  closureReason?: string;
  updatedAt: string;
}

export type BusStatus = 'available' | 'delayed' | 'unavailable';

export interface BusStopSchedule {
  stopId: string;
  departureTime: string; // HH:MM 24h
}

export interface Bus {
  id: string;
  code: string;
  routeName: string;
  routeNameKn: string;
  driverId: string;
  status: BusStatus;
  delayMinutes: number;
  capacity: number;
  occupiedSeats: number;
  currentStopId: string;
  currentStopIndex: number;
  lastUpdatedAt: string;
  dataTag: DataFreshnessLabel;
  schedule: BusStopSchedule[];
  statusNote?: string;
}

export type DriverVerificationStatus = 'approved' | 'pending' | 'rejected';

export interface Driver {
  id: string;
  name: string;
  assignedBusId: string;
  verificationStatus: DriverVerificationStatus;
  // Restricted fields: strictly visible ONLY in Admin view, never in Student or Kiosk views
  phoneMasked: string;
  licenseNumber: string;
  submittedDocument: string;
  rejectionOrPendingNote?: string;
  updatedAt: string;
}

export interface StudentCrisisRequest {
  id: string;
  studentName: string;
  studentCode: string;
  originStopId: string;
  destinationStopId: string;
  requestedAt: string; // ISO timestamp
  examDeadline?: string; // HH:MM
  seatCount: number;
  priorityNote?: string;
}

export interface QueuedUpdate {
  id: string;
  idempotencyKey: string;
  driverId: string;
  busId: string;
  updateType: 'status' | 'gps_step' | 'occupancy';
  summary: string;
  payload: {
    status?: BusStatus;
    delayMinutes?: number;
    statusNote?: string;
    currentStopId?: string;
    currentStopIndex?: number;
    occupiedSeats?: number;
  };
  createdAt: string;
  syncedAt?: string;
  syncState: 'queued' | 'synced' | 'duplicate_ignored';
}

export interface JourneyLeg {
  busId: string;
  busCode: string;
  routeName: string;
  status: BusStatus;
  delayMinutes: number;
  isStale: boolean;
  ageMinutes: number;
  boardStopId: string;
  alightStopId: string;
  boardTimeMin: number;
  alightTimeMin: number;
  intermediateStopIds: string[];
  dataTag: DataFreshnessLabel;
}

export interface JourneyOption {
  id: string;
  legs: JourneyLeg[];
  departureTimeMin: number;
  arrivalTimeMin: number;
  totalTravelMinutes: number;
  transfers: number;
  meetsTargetArrival: boolean;
  reliabilityScore: number;
  hasStaleData: boolean;
  hasDelayedLeg: boolean;
  transferStopIds: string[];
}

export interface InfeasibilityDetail {
  unavailableBuses: { code: string; routeName: string; note?: string }[];
  closedRoads: { name: string; reason?: string }[];
  explanation: string;
}

export interface RouteSearchResult {
  options: JourneyOption[];
  infeasibility?: InfeasibilityDetail;
  excludedNotices: string[];
}

export interface MissedBusRescueResult {
  missedBus: Bus;
  isStale: boolean;
  ageMinutes: number;
  timingUncertain: boolean;
  warningMessage: string;
  canInterceptLater: boolean;
  interceptMessage?: string;
  alternativeSearch: RouteSearchResult;
}

export interface BusCapacitySnapshot {
  busId: string;
  busCode: string;
  routeName: string;
  totalCapacity: number;
  baselineOccupied: number;
  crisisAllocated: number;
  remainingSeats: number;
  excludedReason?: string;
}

export interface CrisisAllocationOutcome {
  request: StudentCrisisRequest;
  rankIndex: number;
  allocated: boolean;
  journey?: JourneyOption;
  unassignedReason?: string;
}

export interface CrisisAllocationResult {
  methodLabel: string;
  ranAt: string;
  outcomes: CrisisAllocationOutcome[];
  busSnapshots: BusCapacitySnapshot[];
  summary: {
    totalRequests: number;
    totalSeatsRequested: number;
    assignedCount: number;
    unassignedCount: number;
    examPriorityAssigned: number;
    examPriorityTotal: number;
  };
}

export interface RoutelessState {
  villages: Village[];
  stops: Stop[];
  roads: RoadSegment[];
  buses: Bus[];
  drivers: Driver[];
  crisisRequests: StudentCrisisRequest[];
  syncQueue: QueuedUpdate[];
  lastSyncedAt: string;
  simulatedOffline: boolean;
  activeDriverId: string;
  seedAnchorMs: number;
}
