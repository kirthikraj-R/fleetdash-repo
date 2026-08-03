import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

function StatCard({ label, value, suffix, accent = 'text-ink' }) {
  return (
    <div className="flex min-w-[130px] flex-col gap-1 rounded-2xl bg-panel px-4 py-3.5 shadow-clay-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
      <span className={`font-display text-xl font-600 tabular ${accent}`}>
        {value}
        {suffix && <span className="ml-1 text-xs font-body font-500 text-muted">{suffix}</span>}
      </span>
    </div>
  );
}

export default function StatsBar() {
  const stats = useFleetStore((s) => s.stats);
  const alerts = useFleetStore((s) => s.alerts);

  return (
    <div className="flex flex-wrap gap-3">
      <StatCard label="Tracked Vehicles" value={stats.vehicleCount.toLocaleString()} />
      <StatCard label="Active" value={stats.activeCount.toLocaleString()} accent="text-cyan" />
      <StatCard label="Idle" value={stats.idleCount.toLocaleString()} accent="text-muted" />
      <StatCard label="Avg Speed" value={stats.avgSpeed.toFixed(1)} suffix="km/h" />
      <StatCard label="Throughput" value={stats.throughput.toLocaleString()} suffix="pts/sec" accent="text-green" />
      <StatCard label="Alerts (session)" value={alerts.length.toLocaleString()} accent={alerts.length ? 'text-amber' : 'text-ink'} />
    </div>
  );
}
