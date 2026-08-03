import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

const KIND_LABEL = {
  restricted: 'Restricted',
  depot: 'Depot',
  delivery: 'Delivery',
  custom: 'Custom',
};

export default function ZoneLegend() {
  const zones = useFleetStore((s) => s.zones);
  const kinds = Array.from(new Set(zones.map((z) => z.kind)));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-panel px-4 py-2.5 shadow-clay-xs">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Zones</span>
      {kinds.map((k) => {
        const zone = zones.find((z) => z.kind === k);
        return (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone?.color }} />
            <span className="font-body text-[11px] text-muted">{KIND_LABEL[k] || k}</span>
          </div>
        );
      })}
      <span className="mx-1 h-3 w-px bg-line" />
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-cyan" />
        <span className="font-body text-[11px] text-muted">Active vehicle</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-muted" />
        <span className="font-body text-[11px] text-muted">Idle vehicle</span>
      </div>
    </div>
  );
}
