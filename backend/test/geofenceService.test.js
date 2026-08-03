import { addZone, evaluatePoint, listZones, removeZone } from '../src/services/geofenceService.js';

describe('geofenceService', () => {
  const squareZoneId = 'test-square-zone';

  beforeAll(() => {
    // A simple 1-degree square for deterministic in/out testing, independent
    // of the seeded demo circles.
    addZone({
      id: squareZoneId,
      name: 'Test Square',
      kind: 'custom',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    });
  });

  afterAll(() => {
    removeZone(squareZoneId);
  });

  it('lists zones with valid GeoJSON geometry', () => {
    const zones = listZones();
    const zone = zones.find((z) => z.id === squareZoneId);
    expect(zone).toBeDefined();
    expect(zone.geometry.type).toBe('Polygon');
  });

  it('emits an ENTER event the first time a vehicle appears inside a zone', () => {
    const events = evaluatePoint('VH-TEST-1', 0.5, 0.5); // inside the square
    const enterEvent = events.find((e) => e.zoneId === squareZoneId);
    expect(enterEvent).toBeDefined();
    expect(enterEvent.type).toBe('ENTER');
  });

  it('does not re-emit ENTER on a second ping still inside the same zone', () => {
    evaluatePoint('VH-TEST-2', 0.5, 0.5); // first ping — establishes ENTER
    const events = evaluatePoint('VH-TEST-2', 0.51, 0.51); // still inside
    const enterEvent = events.find((e) => e.zoneId === squareZoneId);
    expect(enterEvent).toBeUndefined();
  });

  it('emits an EXIT event when a vehicle leaves a zone it was inside', () => {
    evaluatePoint('VH-TEST-3', 0.5, 0.5); // inside
    const events = evaluatePoint('VH-TEST-3', 5, 5); // well outside
    const exitEvent = events.find((e) => e.zoneId === squareZoneId);
    expect(exitEvent).toBeDefined();
    expect(exitEvent.type).toBe('EXIT');
  });

  it('emits no events for a vehicle that never enters any zone', () => {
    const events = evaluatePoint('VH-TEST-4', 50, 50); // far from every zone
    expect(events).toHaveLength(0);
  });
});
