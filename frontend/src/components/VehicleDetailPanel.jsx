import React, { useEffect, useState } from 'react';
import { Phone, CreditCard, MapPin } from 'lucide-react';
import { getVehicle } from '../store/fleetBuffer.js';
import { useFleetStore } from '../store/fleetStore.js';
import { initials, driverPhone, licensePlate } from '../lib/driverDetails.js';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="font-mono text-xs tabular text-ink">{value}</span>
    </div>
  );
}

export default function VehicleDetailPanel() {
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (!selectedVehicleId) {
      setSnapshot(null);
      return;
    }
    const tick = () => {
      const entry = getVehicle(selectedVehicleId);
      setSnapshot(entry ? entry.current : null);
    };
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [selectedVehicleId]);

  if (!selectedVehicleId) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl bg-panel px-4 text-center font-mono text-xs text-muted shadow-clay-inset">
        Select a vehicle track on the map or list to inspect it.
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl bg-panel px-4 text-center font-mono text-xs text-muted shadow-clay-sm">
        VH signal lost — {selectedVehicleId}
      </div>
    );
  }

  const driverName = snapshot.meta?.driver || 'Unassigned';
  const hub = snapshot.meta?.hub;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-2xl bg-panel p-4 shadow-clay-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-base font-600 text-ink">{snapshot.vehicleId}</div>
          <div className="font-body text-xs text-muted capitalize">{snapshot.meta?.type}</div>
        </div>
        <button
          onClick={() => selectVehicle(null)}
          className="rounded-full bg-panel2 px-3 py-1.5 font-mono text-[10px] uppercase text-muted shadow-clay-xs hover:text-ink"
        >
          Close
        </button>
      </div>

      <div
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider shadow-clay-xs ${
          snapshot.status === 'active' ? 'bg-panel2 text-cyan' : 'bg-panel2 text-muted'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${snapshot.status === 'active' ? 'bg-cyan animate-blink' : 'bg-muted'}`} />
        {snapshot.status}
      </div>

      {/* Driver card */}
      <div className="rounded-2xl bg-panel2 p-4 shadow-clay-xs">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">Driver</div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-panel font-mono text-sm font-600 text-cyan shadow-clay-sm">
            {initials(driverName)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-600 text-ink">{driverName}</div>
            <div className="truncate font-body text-[11px] text-muted">
              {hub ? `${hub} depot` : 'Depot unassigned'}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 pt-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <Phone size={12} className="shrink-0 text-cyan" />
            <span className="tabular text-ink">{driverPhone(snapshot.vehicleId)}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <CreditCard size={12} className="shrink-0 text-cyan" />
            <span className="tabular text-ink">{licensePlate(snapshot.vehicleId, hub)}</span>
          </div>
          {hub && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
              <MapPin size={12} className="shrink-0 text-cyan" />
              <span className="text-ink">{hub} region</span>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-line/40 rounded-2xl bg-panel2 px-4 shadow-clay-xs">
        <Row label="Speed" value={`${snapshot.speedKph.toFixed(1)} km/h`} />
        <Row label="Heading" value={`${snapshot.heading.toFixed(0)}°`} />
        <Row label="Fuel" value={`${snapshot.fuel?.toFixed(1) ?? '—'}%`} />
        <Row label="Latitude" value={snapshot.lat.toFixed(6)} />
        <Row label="Longitude" value={snapshot.lng.toFixed(6)} />
        <Row label="Last Update" value={new Date(snapshot.timestamp).toLocaleTimeString(undefined, { hour12: false })} />
      </div>

      {/* Fuel gauge */}
      <div>
        <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>Fuel Level</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-panel2 shadow-clay-inset">
          <div
            className={`h-full rounded-full transition-all ${
              (snapshot.fuel ?? 0) < 20 ? 'bg-red' : (snapshot.fuel ?? 0) < 50 ? 'bg-amber' : 'bg-green'
            }`}
            style={{ width: `${snapshot.fuel ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
