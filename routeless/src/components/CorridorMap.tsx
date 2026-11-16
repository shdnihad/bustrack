import React from 'react';
import { Bus, JourneyOption, RoadSegment, Stop } from '../types/routeless';

interface CorridorMapProps {
  stops: Stop[];
  roads: RoadSegment[];
  buses: Bus[];
  highlightedJourney?: JourneyOption | null;
  selectedOriginId?: string;
  selectedDestinationId?: string;
  onSelectStop?: (stopId: string) => void;
}

export const CorridorMap: React.FC<CorridorMapProps> = ({
  stops,
  roads,
  buses,
  highlightedJourney,
  selectedOriginId,
  selectedDestinationId,
  onSelectStop,
}) => {
  const stopMap = new Map(stops.map((s) => [s.id, s]));

  // Build set of highlighted edges from the selected journey
  const highlightedEdgeSet = new Set<string>();
  const transferStopSet = new Set<string>(highlightedJourney?.transferStopIds ?? []);

  if (highlightedJourney) {
    for (const leg of highlightedJourney.legs) {
      const bus = buses.find((b) => b.id === leg.busId);
      if (!bus) continue;
      const startIdx = bus.schedule.findIndex((s) => s.stopId === leg.boardStopId);
      const endIdx = bus.schedule.findIndex((s) => s.stopId === leg.alightStopId);
      if (startIdx >= 0 && endIdx > startIdx) {
        for (let i = startIdx; i < endIdx; i++) {
          const a = bus.schedule[i].stopId;
          const b = bus.schedule[i + 1].stopId;
          highlightedEdgeSet.add(`${a}-${b}`);
          highlightedEdgeSet.add(`${b}-${a}`);
        }
      }
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Malnad Rural Corridor Graph (Schematic Demo Map)
          </h3>
          <p className="text-xs text-slate-500">
            Schematic topology of 6 villages, 12 stops, and 3 educational institutions · No external map API required
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-slate-300" />
            Open Road
          </span>
          <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-red-600" />
            Closed Road
          </span>
          <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
            <span className="inline-block h-1 w-4 bg-blue-700 rounded" />
            Selected Route
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 880 440"
          className="h-auto w-full min-w-[640px] rounded-lg border border-slate-100 bg-slate-50"
          role="img"
          aria-label="Schematic transit graph showing rural village stops, closed roads, and active bus routes"
        >
          {/* Road segments */}
          {roads.map((road) => {
            const from = stopMap.get(road.fromStopId);
            const to = stopMap.get(road.toStopId);
            if (!from || !to) return null;

            const isHighlighted = highlightedEdgeSet.has(
              `${road.fromStopId}-${road.toStopId}`
            );

            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <g key={road.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={
                    road.isClosed
                      ? '#dc2626'
                      : isHighlighted
                      ? '#1d4ed8'
                      : '#cbd5e1'
                  }
                  strokeWidth={isHighlighted ? 4.5 : road.isClosed ? 3 : 2}
                  strokeDasharray={road.isClosed ? '7 5' : undefined}
                />
                {road.isClosed && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x={-28}
                      y={-10}
                      width={56}
                      height={20}
                      rx={4}
                      fill="#fef2f2"
                      stroke="#dc2626"
                      strokeWidth={1.2}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                      fill="#b91c1c"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      CLOSED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Stops */}
          {stops.map((stop) => {
            const isOrigin = stop.id === selectedOriginId;
            const isDest = stop.id === selectedDestinationId;
            const isTransfer = transferStopSet.has(stop.id);
            const isCampus = stop.isEducationalDestination;

            let fill = '#ffffff';
            let stroke = '#475569';
            let radius = 8;

            if (isCampus) {
              fill = '#eff6ff';
              stroke = '#1d4ed8';
              radius = 10;
            }
            if (isTransfer) {
              fill = '#fffbeb';
              stroke = '#d97706';
              radius = 10;
            }
            if (isOrigin) {
              fill = '#15803d';
              stroke = '#14532d';
              radius = 11;
            }
            if (isDest) {
              fill = '#1d4ed8';
              stroke = '#1e3a8a';
              radius = 11;
            }

            return (
              <g
                key={stop.id}
                transform={`translate(${stop.x}, ${stop.y})`}
                onClick={() => onSelectStop?.(stop.id)}
                className={onSelectStop ? 'cursor-pointer' : undefined}
              >
                <circle
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={2.5}
                />
                <text
                  y={stop.y < 140 ? -16 : 23}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={isOrigin || isDest || isCampus ? 700 : 500}
                  fill="#0f172a"
                  fontFamily="DM Sans, sans-serif"
                >
                  {stop.name.length > 22 ? `${stop.name.slice(0, 20)}…` : stop.name}
                </text>
                {isOrigin && (
                  <text
                    y={stop.y < 140 ? -29 : 36}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#15803d"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    ORIGIN
                  </text>
                )}
                {isDest && (
                  <text
                    y={stop.y < 140 ? -29 : 36}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#1d4ed8"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    CAMPUS
                  </text>
                )}
                {isTransfer && !isOrigin && !isDest && (
                  <text
                    y={-15}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#b45309"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    TRANSFER
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
