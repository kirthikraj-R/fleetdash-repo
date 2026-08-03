import React, { useEffect, useState } from 'react';
import { useFleetStore } from '../store/fleetStore.js';

export default function BreachToast() {
  const alerts = useFleetStore((s) => s.alerts);
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[0];
    setVisible(latest);
    const t = setTimeout(() => setVisible((cur) => (cur?.id === latest.id ? null : cur)), 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length]);

  if (!visible) return null;

  const isRestricted = visible.zoneKind === 'restricted' && visible.type === 'ENTER';

  return (
    <div
      key={visible.id}
      className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 animate-slideIn items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 shadow-clay-sm backdrop-blur-md"
    >
      <span className={`h-2 w-2 rounded-full ${isRestricted ? 'bg-[#E0524F]' : 'bg-[#C67E12]'} animate-blink`} />
      <span className="font-mono text-xs text-[#1E2530]">
        <span className="font-600">{visible.vehicleId}</span>{' '}
        {visible.type === 'ENTER' ? 'entered' : 'exited'} <span className="font-600">{visible.zoneName}</span>
      </span>
    </div>
  );
}
