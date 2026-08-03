import React, { useEffect, useState } from 'react';
import { useFleetStore } from '../store/fleetStore.js';

const STATUS_CONFIG = {
  online: { label: 'LIVE', dot: 'bg-green', text: 'text-green' },
  connecting: { label: 'CONNECTING', dot: 'bg-amber', text: 'text-amber' },
  offline: { label: 'OFFLINE', dot: 'bg-red', text: 'text-red' },
};

export default function TopBar({ title, subtitle }) {
  const connectionStatus = useFleetStore((s) => s.connectionStatus);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = STATUS_CONFIG[connectionStatus];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-6 py-3">
      <div>
        <h1 className="font-display text-base font-600 tracking-wide text-ink">{title}</h1>
        {subtitle && <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-panel px-3.5 py-2 font-mono text-xs text-muted shadow-clay-xs sm:flex">
          <span>{now.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}</span>
          <span className="text-line">/</span>
          <span className="tabular text-ink">{now.toLocaleTimeString(undefined, { hour12: false })}</span>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full bg-panel px-3.5 py-2 font-mono text-[11px] font-500 tracking-wider shadow-clay-xs ${status.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${connectionStatus === 'online' ? 'animate-blink' : ''}`} />
          {status.label}
        </div>
      </div>
    </header>
  );
}
