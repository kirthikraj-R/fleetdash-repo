import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { useFleetStore } from '../store/fleetStore.js';
import { api } from '../lib/api.js';

const DEMO_CENTER = { lat: 22.9734, lng: 78.6569 }; // geographic center of India

const KIND_OPTIONS = [
  { value: 'custom', label: 'Custom', color: '#FFB020' },
  { value: 'restricted', label: 'Restricted', color: '#FF5C5C' },
  { value: 'delivery', label: 'Delivery', color: '#4FD8E0' },
  { value: 'depot', label: 'Depot', color: '#3DDC84' },
];

function circlePolygon(centerLat, centerLng, radiusKm, steps = 48) {
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const lat = centerLat + dy / 111;
    const lng = centerLng + dx / (111 * Math.cos((centerLat * Math.PI) / 180));
    coords.push([lng, lat]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

export default function GeofencesPage() {
  const zones = useFleetStore((s) => s.zones);
  const setZones = useFleetStore((s) => s.setZones);

  const [form, setForm] = useState({
    name: '',
    kind: 'custom',
    lat: DEMO_CENTER.lat,
    lng: DEMO_CENTER.lng,
    radiusKm: 2,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function refreshZones() {
    try {
      const fresh = await api.getZones();
      setZones(fresh);
    } catch (err) {
      console.error('Failed to refresh zones', err);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Zone needs a name.');
      return;
    }
    setSubmitting(true);
    try {
      const kindMeta = KIND_OPTIONS.find((k) => k.value === form.kind);
      await api.createZone({
        name: form.name.trim(),
        kind: form.kind,
        color: kindMeta?.color,
        geometry: circlePolygon(Number(form.lat), Number(form.lng), Number(form.radiusKm)),
      });
      setForm((f) => ({ ...f, name: '' }));
      await refreshZones();
    } catch (err) {
      setError(err.message || 'Failed to create zone.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteZone(id);
      await refreshZones();
    } catch (err) {
      console.error('Failed to delete zone', err);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Geofences" subtitle={`${zones.length} active zones`} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start grid-cols-1 gap-3 sm:grid-cols-2">
          {zones.map((z) => {
            const kindMeta = KIND_OPTIONS.find((k) => k.value === z.kind) || KIND_OPTIONS[0];
            return (
              <div key={z.id} className="rounded-2xl bg-panel p-4 shadow-clay-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.color || kindMeta.color }} />
                    <h3 className="font-display text-sm font-600 text-ink">{z.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(z.id)}
                    className="text-muted transition-colors hover:text-red"
                    title="Delete zone"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">{z.kind}</p>
                <p className="mt-2 font-body text-[11px] text-muted">
                  {z.geometry.coordinates[0].length - 1} boundary points
                </p>
              </div>
            );
          })}
          {zones.length === 0 && (
            <div className="col-span-full rounded-2xl bg-panel px-4 py-12 text-center font-mono text-xs text-muted shadow-clay-inset">
              No zones yet — create one to start tracking breaches.
            </div>
          )}
        </div>

        <div className="h-fit rounded-2xl bg-panel p-5 shadow-clay-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan" />
            <h3 className="font-display text-sm font-600 text-ink">New Geofence</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. South Warehouse"
                className="w-full rounded-xl bg-panel2 px-3.5 py-2.5 font-body text-xs text-ink shadow-clay-inset placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cyan/30"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Kind</label>
              <div className="flex flex-wrap gap-1.5">
                {KIND_OPTIONS.map((k) => (
                  <button
                    type="button"
                    key={k.value}
                    onClick={() => setForm((f) => ({ ...f, kind: k.value }))}
                    className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all ${
                      form.kind === k.value ? 'bg-panel2 text-cyan shadow-clay-inset' : 'bg-panel2 text-muted shadow-clay-xs'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  className="w-full rounded-xl bg-panel2 px-3.5 py-2.5 font-mono text-xs text-ink shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-cyan/30"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  className="w-full rounded-xl bg-panel2 px-3.5 py-2.5 font-mono text-xs text-ink shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-cyan/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
                Radius — {form.radiusKm} km
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={form.radiusKm}
                onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value }))}
                className="w-full accent-cyan"
              />
            </div>

            {error && <div className="rounded-xl bg-red/10 px-3 py-2.5 font-body text-xs text-red shadow-clay-xs">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-cyan px-4 py-3 font-display text-sm font-600 text-ink0 shadow-clay-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Plus size={15} />
              {submitting ? 'Creating…' : 'Create zone'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
