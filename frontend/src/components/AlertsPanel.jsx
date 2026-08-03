import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

const KIND_STYLE = {
  restricted: { text: 'text-red', bg: 'bg-red/10' },
  delivery: { text: 'text-cyan', bg: 'bg-cyan/10' },
  depot: { text: 'text-green', bg: 'bg-green/10' },
  custom: { text: 'text-amber', bg: 'bg-amber/10' },
};

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

export default function AlertsPanel() {
  const alerts = useFleetStore((s) => s.alerts);
  const clearAlerts = useFleetStore((s) => s.clearAlerts);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-panel p-4 shadow-clay-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-600 tracking-wide text-ink">Geofence Alerts</h2>
        {alerts.length > 0 && (
          <button onClick={clearAlerts} className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
        {alerts.length === 0 && (
          <div className="rounded-2xl bg-panel2/60 px-4 py-8 text-center font-mono text-xs text-muted">
            No breaches yet. Alerts will appear here the instant a vehicle crosses a geofence.
          </div>
        )}
        {alerts.map((a) => {
          const style = KIND_STYLE[a.zoneKind] || KIND_STYLE.custom;
          return (
            <button
              key={a.id}
              onClick={() => selectVehicle(a.vehicleId)}
              className={`block w-full animate-slideIn rounded-2xl ${style.bg} px-3.5 py-3 text-left shadow-clay-xs transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] font-600 uppercase tracking-wider ${style.text}`}>
                  {a.type === 'ENTER' ? 'Zone entered' : 'Zone exited'}
                </span>
                <span className="font-mono text-[10px] text-muted">{timeAgo(a.timestamp)}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-ink">{a.vehicleId}</div>
              <div className="font-body text-[11px] text-muted">{a.zoneName}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
