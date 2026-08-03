import request from 'supertest';
import { createApp } from '../src/app.js';

describe('FleetDash REST API', () => {
  let app;
  let fleetSnapshot;

  beforeEach(() => {
    ({ app, fleetSnapshot } = createApp());
  });

  describe('GET /api/health', () => {
    it('returns ok:true with a timestamp', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.timestamp).toBe('number');
    });
  });

  describe('GET /api/vehicles', () => {
    it('returns an empty array when no telemetry has been ingested', async () => {
      const res = await request(app).get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('reflects vehicles present in the fleet snapshot', async () => {
      fleetSnapshot.set('VH-0001', { vehicleId: 'VH-0001', lat: 12.97, lng: 77.59, speedKph: 40 });
      const res = await request(app).get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].vehicleId).toBe('VH-0001');
    });
  });

  describe('GET /api/geofences', () => {
    it('returns the seeded demo zones', async () => {
      const res = await request(app).get('/api/geofences');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10); // one per Indian hub region
      const names = res.body.map((z) => z.name);
      expect(names).toEqual(expect.arrayContaining(['Delhi Depot', 'Bengaluru Restricted Zone']));
    });

    it('every returned zone has a valid GeoJSON Polygon geometry', async () => {
      const res = await request(app).get('/api/geofences');
      for (const zone of res.body) {
        expect(zone.geometry.type).toBe('Polygon');
        expect(Array.isArray(zone.geometry.coordinates)).toBe(true);
      }
    });
  });

  describe('POST /api/geofences', () => {
    it('creates a new zone and it appears in the list', async () => {
      const geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [77.59, 12.97],
            [77.6, 12.97],
            [77.6, 12.98],
            [77.59, 12.98],
            [77.59, 12.97],
          ],
        ],
      };

      const createRes = await request(app)
        .post('/api/geofences')
        .send({ name: 'Test Zone', kind: 'custom', color: '#FFB020', geometry });

      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Test Zone');
      expect(createRes.body.id).toMatch(/^zone-/);

      const listRes = await request(app).get('/api/geofences');
      const names = listRes.body.map((z) => z.name);
      expect(names).toContain('Test Zone');
    });

    it('rejects a zone missing a name', async () => {
      const res = await request(app)
        .post('/api/geofences')
        .send({ kind: 'custom', geometry: { type: 'Polygon', coordinates: [[[0, 0]]] } });
      expect(res.status).toBe(400);
    });

    it('rejects a zone with a non-Polygon geometry', async () => {
      const res = await request(app)
        .post('/api/geofences')
        .send({ name: 'Bad Zone', geometry: { type: 'Point', coordinates: [0, 0] } });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/geofences/:id', () => {
    it('removes an existing zone', async () => {
      const geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [77.59, 12.97],
            [77.6, 12.97],
            [77.6, 12.98],
            [77.59, 12.98],
            [77.59, 12.97],
          ],
        ],
      };
      const createRes = await request(app).post('/api/geofences').send({ name: 'Delete Me', geometry });
      const zoneId = createRes.body.id;

      const deleteRes = await request(app).delete(`/api/geofences/${zoneId}`);
      expect(deleteRes.status).toBe(204);

      const listRes = await request(app).get('/api/geofences');
      const names = listRes.body.map((z) => z.name);
      expect(names).not.toContain('Delete Me');
    });

    it('returns 404 for a zone that does not exist', async () => {
      const res = await request(app).delete('/api/geofences/zone-does-not-exist');
      expect(res.status).toBe(404);
    });
  });
});
