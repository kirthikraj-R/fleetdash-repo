import parseBatch from '../src/workers/parserWorker.js';

describe('ingestion parser (worker logic)', () => {
  it('normalizes a well-formed batch and rounds numeric precision', () => {
    const out = parseBatch([
      { vehicleId: 'VH-1', lat: 12.9716123456, lng: 77.5946123456, speedKph: 45.678, heading: 90.2, fuel: 55.5 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].vehicleId).toBe('VH-1');
    expect(out[0].lat).toBeCloseTo(12.971612, 5);
    expect(out[0].speedKph).toBeCloseTo(45.7, 1);
    expect(out[0].status).toBe('active');
  });

  it('drops records missing a vehicleId', () => {
    const out = parseBatch([{ vehicleId: null, lat: 12.9, lng: 77.5 }]);
    expect(out).toHaveLength(0);
  });

  it('drops records with out-of-range latitude/longitude', () => {
    const out = parseBatch([
      { vehicleId: 'VH-2', lat: 999, lng: 77.5 },
      { vehicleId: 'VH-3', lat: 12.9, lng: -999 },
    ]);
    expect(out).toHaveLength(0);
  });

  it('clamps negative speed to zero rather than dropping the point', () => {
    const out = parseBatch([{ vehicleId: 'VH-4', lat: 12.9, lng: 77.5, speedKph: -15 }]);
    expect(out).toHaveLength(1);
    expect(out[0].speedKph).toBe(0);
  });

  it('normalizes heading into the 0-360 range', () => {
    const out = parseBatch([{ vehicleId: 'VH-5', lat: 12.9, lng: 77.5, heading: -30 }]);
    expect(out[0].heading).toBe(330);
  });

  it('clamps fuel to the 0-100 range', () => {
    const out = parseBatch([{ vehicleId: 'VH-6', lat: 12.9, lng: 77.5, fuel: 150 }]);
    expect(out[0].fuel).toBe(100);
  });

  it('processes a mixed batch, keeping only the valid records', () => {
    const out = parseBatch([
      { vehicleId: 'VH-7', lat: 12.9, lng: 77.5 },
      { vehicleId: null, lat: 12.9, lng: 77.5 },
      { vehicleId: 'VH-8', lat: 999, lng: 77.5 },
      { vehicleId: 'VH-9', lat: 12.9, lng: 77.5 },
    ]);
    expect(out.map((p) => p.vehicleId)).toEqual(['VH-7', 'VH-9']);
  });

  it('passes the meta field (driver, type, hub) through instead of dropping it', () => {
    const out = parseBatch([
      { vehicleId: 'VH-10', lat: 12.9, lng: 77.5, meta: { type: 'van', driver: 'Ravi Sharma', hub: 'Delhi' } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].meta).toEqual({ type: 'van', driver: 'Ravi Sharma', hub: 'Delhi' });
  });

  it('omits meta entirely rather than setting it to undefined when the source record has none', () => {
    const out = parseBatch([{ vehicleId: 'VH-11', lat: 12.9, lng: 77.5 }]);
    expect(out[0]).not.toHaveProperty('meta');
  });
});
