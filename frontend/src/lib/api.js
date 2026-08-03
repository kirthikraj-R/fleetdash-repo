const API_BASE = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000') + '/api';

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getZones: () => request('/geofences'),
  createZone: (zone) => request('/geofences', { method: 'POST', body: JSON.stringify(zone) }),
  deleteZone: (id) => request(`/geofences/${id}`, { method: 'DELETE' }),
  getVehicles: () => request('/vehicles'),
};
