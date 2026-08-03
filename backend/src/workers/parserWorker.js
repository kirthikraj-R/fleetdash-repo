/**
 * Ingestion Engine — parser worker.
 *
 * Runs inside a worker_thread (via the Piscina pool in workerPool.js) so that
 * decoding/validating/normalizing high-frequency raw telemetry NEVER blocks
 * the main event loop, which needs to stay free for Socket.io I/O.
 *
 * Each call receives a batch of raw telemetry records and returns normalized,
 * validated records ready to be broadcast + bucketed. This is also where
 * you'd plug in real-world concerns like NMEA sentence parsing, protobuf
 * decoding, checksum validation, or unit conversion.
 */

function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizeRecord(raw) {
  const { vehicleId, lat, lng, speedKph, heading, fuel, timestamp, status, meta } = raw;

  if (!vehicleId || !isValidCoordinate(lat, lng)) {
    return null; // drop malformed points rather than crash the pipeline
  }

  return {
    vehicleId,
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    speedKph: Number.isFinite(speedKph) ? Math.max(0, Math.round(speedKph * 10) / 10) : 0,
    heading: Number.isFinite(heading) ? ((heading % 360) + 360) % 360 : 0,
    fuel: Number.isFinite(fuel) ? Math.min(100, Math.max(0, fuel)) : null,
    status: status || 'active',
    timestamp: timestamp || Date.now(),
    ...(meta ? { meta } : {}),
  };
}

/**
 * Piscina calls the default export for every task. `batch` is an array of
 * raw records; we return the normalized array. Doing this in bulk (rather
 * than one task per point) amortizes the worker message-passing overhead.
 */
export default function parseBatch(batch) {
  const out = [];
  for (const raw of batch) {
    const normalized = normalizeRecord(raw);
    if (normalized) out.push(normalized);
  }
  return out;
}
