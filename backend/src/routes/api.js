import { Router } from 'express';
import { nanoid } from 'nanoid';
import { listZones, addZone, removeZone } from '../services/geofenceService.js';

export function buildApiRouter({ getFleetSnapshot }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  router.get('/vehicles', (_req, res) => {
    res.json(getFleetSnapshot());
  });

  router.get('/geofences', (_req, res) => {
    res.json(listZones());
  });

  router.post('/geofences', (req, res) => {
    const { name, kind, color, geometry } = req.body || {};
    if (!name || !geometry || geometry.type !== 'Polygon') {
      return res.status(400).json({ error: 'name and a Polygon geometry are required' });
    }
    const zone = addZone({ id: `zone-${nanoid(8)}`, name, kind, color, geometry });
    res.status(201).json(zone);
  });

  router.delete('/geofences/:id', (req, res) => {
    const removed = removeZone(req.params.id);
    if (!removed) return res.status(404).json({ error: 'zone not found' });
    res.status(204).end();
  });

  return router;
}
