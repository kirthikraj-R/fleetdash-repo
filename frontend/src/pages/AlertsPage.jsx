import React, { useMemo, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { useFleetStore } from '../store/fleetStore.js';

const KIND_STYLE = {
  restricted: { text: 'text-red', bg: 'bg-red/10', dot: 'bg-red' },
  delivery: { text: 'text-cyan', bg: 'bg-cyan/10', dot: 'bg-cyan' },
  depot: { text: 'text-green', bg: 'bg-green/10', dot: 'bg-green' },
  custom: { text: 'text-amber', bg: 'bg-amber/10', dot: 'bg-amber' },
};

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function AlertsPage() {
  const alerts = useFleetStore((s) => s.alerts);
  const clearAlerts = useFleetStore((s) => s.clearAlerts);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const [kindFilter, setKindFilter] = useState('all');

  const counts = useMemo(() => {
    const c = { restricted: 0, delivery: 0, depot: 0, custom: 0 };
    for (const a of alerts) c[a.zoneKind] = (c[a.zoneKind] || 0) + 1;
    return c;
  }, [alerts]);

  const filtered = kindFilter === 'all' ? alerts : alerts.filter((a) => a.zoneKind === kindFilter);

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Alerts" subtitle={`${alerts.length} breach events this session`} />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(counts).map(([kind, count]) => {
            const style = KIND_STYLE[kind];
            return (
              <button
                key={kind}
                onClick={() => setKindFilter(kindFilter === kind ? 'all' : kind)}
                className={`rounded-2xl px-4 py-3.5 text-left shadow-clay-xs transition-all ${
                  kindFilter === kind ? 'shadow-clay-inset' : ''
                } ${style.bg}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{kind}</span>
                </div>
                <div className={`mt-1 font-display text-xl font-600 ${style.text}`}>{count}</div>
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Filter:</span>
            <button
              onClick={() => setKindFilter('all')}
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all ${
                kindFilter === 'all' ? 'bg-panel text-cyan shadow-clay-inset' : 'bg-panel text-muted shadow-clay-xs'
              }`}
            >
              All
            </button>
          </div>
          {alerts.length > 0 && (
            <button onClick={clearAlerts} className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink">
              Clear session log
            </button>
          )}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-2xl bg-panel px-4 py-12 text-center font-mono text-xs text-muted shadow-clay-inset">
              No breach events{kindFilter !== 'all' ? ` for "${kindFilter}"` : ''} yet.
            </div>
          )}
          {filtered.map((a) => {
            const style = KIND_STYLE[a.zoneKind] || KIND_STYLE.custom;
            return (
              <button
                key={a.id}
                onClick={() => selectVehicle(a.vehicleId)}
                className={`flex w-full items-center justify-between rounded-2xl ${style.bg} px-4 py-3.5 text-left shadow-clay-xs transition-transform hover:-translate-y-0.5`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <div>
                    <div className="font-mono text-xs text-ink">
                      <span className="font-600">{a.vehicleId}</span> {a.type === 'ENTER' ? 'entered' : 'exited'}{' '}
                      <span className="font-600">{a.zoneName}</span>
                    </div>
                    <div className="font-body text-[11px] text-muted">
                      {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted">{timeAgo(a.timestamp)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
