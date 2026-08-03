import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import StatsBar from '../components/StatsBar.jsx';
import ZoneLegend from '../components/ZoneLegend.jsx';
import MapView from '../components/MapView.jsx';
import BreachToast from '../components/BreachToast.jsx';
import { useFleetStore } from '../store/fleetStore.js';
import { useAuth } from '../context/AuthContext.jsx';

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const alerts = useFleetStore((s) => s.alerts);
  const visibleVehicleList = useFleetStore((s) => s.visibleVehicleList);
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Dashboard" subtitle="Fleet overview" />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-600 text-ink">Welcome back{firstName ? `, ${firstName}` : ''}.</h2>
            <p className="mt-1 font-body text-sm text-muted">Here's what your fleet is doing right now.</p>
          </div>
          <Link
            to="/map"
            className="flex items-center gap-1.5 rounded-full bg-panel px-4 py-2.5 font-body text-xs text-ink shadow-clay-xs transition-transform hover:-translate-y-0.5 hover:text-cyan"
          >
            Open live map <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="mb-6">
          <StatsBar />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex h-[420px] min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-600 text-ink">Live Snapshot</h3>
              <ZoneLegend />
            </div>
            <div className="relative min-h-0 flex-1">
              <MapView />
              <BreachToast />
            </div>
          </div>

          <div className="flex h-[420px] min-w-0 flex-col gap-5">
            <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-2xl bg-panel p-4 shadow-clay-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-600 text-ink">Recent Alerts</h3>
                <Link to="/alerts" className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">
                  View all
                </Link>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                {alerts.length === 0 && (
                  <p className="pt-6 text-center font-mono text-xs text-muted">No breaches yet.</p>
                )}
                {alerts.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl bg-panel2 px-3.5 py-2.5 shadow-clay-xs">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[11px] text-ink">{a.vehicleId}</div>
                      <div className="truncate font-body text-[10px] text-muted">
                        {a.type === 'ENTER' ? 'Entered' : 'Exited'} {a.zoneName}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted">{timeAgo(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-[160px] flex-col gap-2 rounded-2xl bg-panel p-4 shadow-clay-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-600 text-ink">Top Speed Right Now</h3>
                <Link to="/fleet" className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">
                  View fleet
                </Link>
              </div>
              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                {visibleVehicleList.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-ink">{v.id}</span>
                    <span className="text-cyan">{v.speedKph.toFixed(0)} km/h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
