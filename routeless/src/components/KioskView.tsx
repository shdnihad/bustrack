import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Languages,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  findJourneys,
  formatAgeLabel,
  formatMinutesToHHMM,
  parseTimeToMinutes,
} from '../engine/routing';
import { KIOSK_STRINGS, KioskLang } from '../i18n/kioskStrings';
import { Bus, RoadSegment, Stop } from '../types/routeless';

interface KioskViewProps {
  stops: Stop[];
  roads: RoadSegment[];
  buses: Bus[];
  lastSyncedAt: string;
}

export const KioskView: React.FC<KioskViewProps> = ({
  stops,
  roads,
  buses,
  lastSyncedAt,
}) => {
  const [lang, setLang] = useState<KioskLang>('en');
  const [originStopId, setOriginStopId] = useState<string>('s1');
  const [destStopId, setDestStopId] = useState<string>('s10');

  const t = KIOSK_STRINGS[lang];
  const stopMap = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const boardingStops = useMemo(
    () => stops.filter((s) => !s.isEducationalDestination),
    [stops]
  );
  const campuses = useMemo(
    () => stops.filter((s) => s.isEducationalDestination),
    [stops]
  );

  const searchResult = useMemo(() => {
    return findJourneys({
      originStopId,
      destinationStopId: destStopId,
      earliestDepartureMin: parseTimeToMinutes('07:00'),
      buses,
      roads,
    });
  }, [originStopId, destStopId, buses, roads]);

  const getStopLabel = (stop: Stop) =>
    lang === 'kn' ? stop.nameKn : stop.name;

  return (
    <div className="space-y-6">
      {/* High-Contrast Kiosk Banner */}
      <div className="rounded-xl border-2 border-slate-900 bg-slate-900 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-slate-300">
              {t.cacheBannerPrefix} · {formatAgeLabel(lastSyncedAt)}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
            className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border-2 border-white bg-white px-5 text-base font-bold text-slate-900 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <Languages className="h-5 w-5" />
            {t.switchLangLabel}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200">
          {t.cacheBannerNote}
        </div>
      </div>

      {/* Zero-Typing Touch Selection Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border-2 border-slate-300 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">{t.step1}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {boardingStops.map((stop) => {
              const active = originStopId === stop.id;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => setOriginStopId(stop.id)}
                  className={`min-h-[56px] rounded-xl border-2 px-4 py-3 text-left text-sm font-bold transition-colors ${
                    active
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-slate-900'
                  }`}
                >
                  {getStopLabel(stop)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-300 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{t.step2}</h2>
            <button
              type="button"
              onClick={() => {
                setOriginStopId('s1');
                setDestStopId('s10');
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-slate-300 px-3 text-xs font-bold text-slate-800 hover:border-slate-900"
            >
              <RotateCcw className="h-4 w-4" />
              {t.clearButton}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            {campuses.map((stop) => {
              const active = destStopId === stop.id;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => setDestStopId(stop.id)}
                  className={`min-h-[60px] rounded-xl border-2 px-4 py-3 text-left text-base font-bold transition-colors ${
                    active
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-slate-900'
                  }`}
                >
                  {getStopLabel(stop)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kiosk Results */}
      <div className="rounded-xl border-2 border-slate-900 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">
          {t.resultsHeading} ({searchResult.options.length})
        </h2>

        {searchResult.options.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-red-700 bg-red-50 p-5 text-red-950">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-700" />
              <div>
                <h3 className="text-base font-bold">{t.noRouteHeading}</h3>
                <p className="mt-1 text-sm">
                  {searchResult.infeasibility?.explanation}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {searchResult.options.map((opt) => (
              <div
                key={opt.id}
                className="rounded-xl border-2 border-slate-300 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                    <span>{formatMinutesToHHMM(opt.departureTimeMin)}</span>
                    <ArrowRight className="h-5 w-5 text-slate-500" />
                    <span>{formatMinutesToHHMM(opt.arrivalTimeMin)}</span>
                  </div>

                  <div className="text-sm font-bold text-slate-800">
                    {opt.transfers === 0 ? t.directLabel : `${opt.transfers} · ${t.transferLabel}`}{' '}
                    ·{' '}
                    <span className="font-mono tabular-nums">
                      {opt.totalTravelMinutes} {t.minutes}
                    </span>
                  </div>
                </div>

                {opt.hasStaleData && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-100 px-3 py-2 text-sm font-bold text-amber-950">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-800" />
                    {t.staleWarning}
                  </div>
                )}

                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  {opt.legs.map((leg, i) => {
                    const bStop = stopMap.get(leg.boardStopId);
                    const aStop = stopMap.get(leg.alightStopId);
                    return (
                      <div
                        key={`${leg.busId}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <div className="font-bold text-slate-900">
                          <span className="font-mono text-blue-800">
                            {leg.busCode}
                          </span>{' '}
                          · {bStop ? getStopLabel(bStop) : leg.boardStopId} (
                          {formatMinutesToHHMM(leg.boardTimeMin)}) →{' '}
                          {aStop ? getStopLabel(aStop) : leg.alightStopId} (
                          {formatMinutesToHHMM(leg.alightTimeMin)})
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs font-bold">
                          {leg.status === 'delayed' ? (
                            <span className="text-amber-800">
                              {t.delayedLabel} (+{leg.delayMinutes}m)
                            </span>
                          ) : (
                            <span className="text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {t.availableLabel}
                            </span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600">
                            {t.lastUpdated}: {leg.ageMinutes}m
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 border-t border-slate-200 pt-3 text-xs font-medium text-slate-600">
          {t.readOnlyNotice}
        </p>
      </div>
    </div>
  );
};
