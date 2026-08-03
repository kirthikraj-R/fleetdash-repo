import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Truck, BellRing, ShieldCheck, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFleetStore } from '../store/fleetStore.js';
import ThemeToggle from './ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/map', label: 'Live Map', icon: Map },
  { to: '/fleet', label: 'Fleet', icon: Truck },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/geofences', label: 'Geofences', icon: ShieldCheck },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function NavSidebar() {
  const { user, logout } = useAuth();
  const alerts = useFleetStore((s) => s.alerts);

  return (
    <nav className="flex h-full w-[232px] shrink-0 flex-col bg-deep p-4">
      <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-panel px-4 py-3.5 shadow-clay-sm">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-panel shadow-clay-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-glow" />
          <span className="absolute h-2.5 w-2.5 animate-pulseRing rounded-full bg-cyan" />
        </div>
        <div>
          <div className="font-display text-[13px] font-700 tracking-wide text-ink">FLEETDASH</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Ops Console</div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 font-body text-sm transition-all ${
                isActive ? 'bg-panel text-cyan shadow-clay-inset' : 'text-muted hover:bg-panel/60 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
                {label === 'Alerts' && alerts.length > 0 && (
                  <span className="ml-auto rounded-full bg-amber/20 px-1.5 py-0.5 font-mono text-[10px] font-600 text-amber">
                    {alerts.length > 99 ? '99+' : alerts.length}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between rounded-2xl bg-panel px-3.5 py-2.5 shadow-clay-xs">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-panel px-3 py-3 shadow-clay-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel font-mono text-[11px] font-600 text-cyan shadow-clay-xs">
            {initials(user?.name || 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-body text-xs font-500 text-ink">{user?.name}</div>
            <div className="truncate font-mono text-[10px] text-muted">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-red/10 hover:text-red"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
