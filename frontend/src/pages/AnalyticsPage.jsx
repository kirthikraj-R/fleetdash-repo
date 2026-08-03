import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import TopBar from '../components/TopBar.jsx';
import { getAllVehicles } from '../store/fleetBuffer.js';
import { useFleetStore } from '../store/fleetStore.js';
import { useTheme } from '../context/ThemeContext.jsx';

const SAMPLE_INTERVAL_MS = 2000;
const MAX_SAMPLES = 30;

/** Reads the live theme colors from CSS variables so chart colors match the current light/dark palette. */
function useChartColors() {
  const { theme } = useTheme();
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const rgb = (name) => `rgb(${style.getPropertyValue(name).trim().split(' ').join(', ')})`;
    return {
      cyan: rgb('--color-cyan'),
      amber: rgb('--color-amber'),
      green: rgb('--color-green'),
      red: rgb('--color-red'),
      muted: rgb('--color-muted'),
      ink: rgb('--color-ink'),
      line: rgb('--color-line'),
      panel: rgb('--color-panel'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl bg-panel p-5 shadow-clay-sm ${className}`}>
      <div>
        <h3 className="font-display text-sm font-600 text-ink">{title}</h3>
        {subtitle && <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{subtitle}</p>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const colors = useChartColors();
  const alerts = useFleetStore((s) => s.alerts);
  const stats = useFleetStore((s) => s.stats);

  const [history, setHistory] = useState([]);
  const [hubDistribution, setHubDistribution] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);

  useEffect(() => {
    function sample() {
      const vehicles = getAllVehicles();
      let speedSum = 0;
      let active = 0;
      let idle = 0;
      const hubCounts = {};
      const typeCounts = {};

      for (const [, entry] of vehicles) {
        const c = entry.current;
        speedSum += c.speedKph || 0;
        if (c.status === 'active') active++;
        else idle++;

        const hub = c.meta?.hub || 'Unknown';
        hubCounts[hub] = (hubCounts[hub] || 0) + 1;

        const type = c.meta?.type || 'other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }

      const avgSpeed = vehicles.size ? speedSum / vehicles.size : 0;
      const time = new Date().toLocaleTimeString(undefined, { hour12: false, minute: '2-digit', second: '2-digit' });

      setHistory((prev) => [...prev, { time, avgSpeed: Number(avgSpeed.toFixed(1)), active, idle }].slice(-MAX_SAMPLES));
      setHubDistribution(Object.entries(hubCounts).map(([hub, count]) => ({ hub, count })).sort((a, b) => b.count - a.count));
      setTypeDistribution(Object.entries(typeCounts).map(([type, count]) => ({ type, count })));
    }

    sample();
    const t = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const alertsByKind = useMemo(() => {
    const counts = { restricted: 0, delivery: 0, depot: 0, custom: 0 };
    for (const a of alerts) counts[a.zoneKind] = (counts[a.zoneKind] || 0) + 1;
    return Object.entries(counts).map(([kind, count]) => ({ kind, count }));
  }, [alerts]);

  const TYPE_COLORS = [colors.cyan, colors.amber, colors.green, colors.red];
  const KIND_COLOR = { restricted: colors.red, delivery: colors.cyan, depot: colors.green, custom: colors.amber };

  const tooltipStyle = {
    background: colors.panel,
    border: 'none',
    borderRadius: 14,
    boxShadow: '5px 5px 11px rgba(0,0,0,0.15)',
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Analytics" subtitle={`Live fleet trends · ${stats.vehicleCount} vehicles tracked`} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 lg:grid-cols-2">
        <ChartCard title="Average Speed" subtitle="Fleet-wide, sampled every 2s" className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.cyan} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.line} vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: colors.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: colors.muted }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.ink }} />
              <Area type="monotone" dataKey="avgSpeed" stroke={colors.cyan} strokeWidth={2} fill="url(#speedFill)" name="km/h" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Active vs Idle" subtitle="Fleet status over time" className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.line} vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: colors.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: colors.muted }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.ink }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
              <Area type="monotone" dataKey="active" stackId="1" stroke={colors.cyan} fill={colors.cyan} fillOpacity={0.5} name="Active" />
              <Area type="monotone" dataKey="idle" stackId="1" stroke={colors.muted} fill={colors.muted} fillOpacity={0.4} name="Idle" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fleet by Region" subtitle="Vehicles per city hub" className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hubDistribution} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.line} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: colors.muted }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="hub"
                tick={{ fontSize: 10, fill: colors.ink }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.ink }} cursor={{ fill: colors.line, opacity: 0.3 }} />
              <Bar dataKey="count" fill={colors.cyan} radius={[0, 8, 8, 0]} name="Vehicles" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vehicle Types" subtitle="Fleet composition" className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeDistribution}
                dataKey="count"
                nameKey="type"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                cornerRadius={8}
              >
                {typeDistribution.map((entry, i) => (
                  <Cell key={entry.type} fill={TYPE_COLORS[i % TYPE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.ink }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'capitalize' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alerts by Zone Kind" subtitle="This session" className="h-[280px] lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alertsByKind} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.line} vertical={false} />
              <XAxis dataKey="kind" tick={{ fontSize: 10, fill: colors.muted, textTransform: 'capitalize' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: colors.muted }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.ink }} cursor={{ fill: colors.line, opacity: 0.3 }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Breach events">
                {alertsByKind.map((entry) => (
                  <Cell key={entry.kind} fill={KIND_COLOR[entry.kind] || colors.amber} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
