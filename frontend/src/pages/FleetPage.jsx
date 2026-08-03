import React from 'react';
import TopBar from '../components/TopBar.jsx';
import VehicleDetailPanel from '../components/VehicleDetailPanel.jsx';
import { useFleetStore } from '../store/fleetStore.js';

const TYPES = ['all', 'van', 'truck', 'bike', 'refrigerated'];

export default function FleetPage() {
  const search = useFleetStore((s) => s.search);
  const setSearch = useFleetStore((s) => s.setSearch);
  const typeFilter = useFleetStore((s) => s.typeFilter);
  const setTypeFilter = useFleetStore((s) => s.setTypeFilter);
  const visibleVehicleList = useFleetStore((s) => s.visibleVehicleList);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const stats = useFleetStore((s) => s.stats);

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Fleet" subtitle={`${stats.vehicleCount.toLocaleString()} vehicles registered`} />

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle ID or driver…"
              className="w-72 rounded-2xl bg-panel px-4 py-2.5 font-mono text-xs text-ink shadow-clay-inset placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cyan/30"
            />
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all ${
                    typeFilter === t
                      ? 'bg-panel text-cyan shadow-clay-inset'
                      : 'bg-panel text-muted shadow-clay-xs hover:text-ink'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted">
              Showing {visibleVehicleList.length} (top by speed)
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-panel shadow-clay-sm">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
                <tr className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 text-left font-500">Vehicle</th>
                  <th className="px-4 py-2.5 text-left font-500">Driver</th>
                  <th className="px-4 py-2.5 text-left font-500">Type</th>
                  <th className="px-4 py-2.5 text-left font-500">Status</th>
                  <th className="px-4 py-2.5 text-right font-500">Speed</th>
                  <th className="px-4 py-2.5 text-right font-500">Heading</th>
                  <th className="px-4 py-2.5 text-right font-500">Fuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {visibleVehicleList.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => selectVehicle(v.id)}
                    className={`cursor-pointer transition-colors hover:bg-panel2/70 ${
                      selectedVehicleId === v.id ? 'bg-panel2' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{v.id}</td>
                    <td className="px-4 py-2.5 font-body text-xs text-muted">{v.meta?.driver}</td>
                    <td className="px-4 py-2.5 font-body text-xs capitalize text-muted">{v.meta?.type}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase ${
                          v.status === 'active' ? 'text-cyan' : 'text-muted'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${v.status === 'active' ? 'bg-cyan' : 'bg-muted'}`} />
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular text-ink">{v.speedKph.toFixed(0)} km/h</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular text-muted">{v.heading.toFixed(0)}°</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs tabular text-muted">{v.fuel?.toFixed(0)}%</td>
                  </tr>
                ))}
                {visibleVehicleList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center font-mono text-xs text-muted">
                      No vehicles match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="h-full w-[320px] shrink-0">
          <VehicleDetailPanel />
        </aside>
      </div>
    </div>
  );
}
