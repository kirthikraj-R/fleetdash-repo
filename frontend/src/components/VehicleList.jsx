import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

const TYPES = ['all', 'van', 'truck', 'bike', 'refrigerated'];

const STATUS_DOT = {
  active: 'bg-cyan',
  idle: 'bg-muted',
};

export default function VehicleList() {
  const search = useFleetStore((s) => s.search);
  const setSearch = useFleetStore((s) => s.setSearch);
  const typeFilter = useFleetStore((s) => s.typeFilter);
  const setTypeFilter = useFleetStore((s) => s.setTypeFilter);
  const visibleVehicleList = useFleetStore((s) => s.visibleVehicleList);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicle ID or driver…"
          className="w-full rounded-2xl bg-panel px-4 py-2.5 font-mono text-xs text-ink placeholder:text-muted shadow-clay-inset focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all ${
              typeFilter === t ? 'bg-panel text-cyan shadow-clay-inset' : 'bg-panel text-muted shadow-clay-xs hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        <span>Showing {visibleVehicleList.length}</span>
        <span>sorted by speed</span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl bg-panel p-2 shadow-clay-sm">
        {visibleVehicleList.length === 0 && (
          <div className="p-4 text-center font-mono text-xs text-muted">No vehicles match your filters.</div>
        )}
        <ul className="space-y-1.5">
          {visibleVehicleList.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => selectVehicle(v.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                  selectedVehicleId === v.id ? 'bg-panel2 shadow-clay-inset' : 'hover:bg-panel2/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[v.status] || 'bg-muted'}`} />
                  <div>
                    <div className="font-mono text-xs font-500 text-ink">{v.id}</div>
                    <div className="font-body text-[11px] text-muted">{v.meta?.driver} · {v.meta?.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs tabular text-ink">{v.speedKph.toFixed(0)} km/h</div>
                  <div className="font-mono text-[10px] tabular text-muted">{v.fuel?.toFixed(0)}% fuel</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
