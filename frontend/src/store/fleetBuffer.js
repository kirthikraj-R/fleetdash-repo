/**
 * fleetBuffer — a plain module-level store, deliberately OUTSIDE React state.
 *
 * At thousands of coordinate updates/sec, routing every point through
 * useState/useReducer would mean thousands of re-renders/sec — exactly the
 * DOM-overload problem this project exists to avoid. Instead, the socket
 * handler writes directly into this Map, and MapView reads from it on its
 * own interval-driven update loop (see components/MapView.jsx). React
 * only re-renders for low-frequency UI state (selected vehicle, alert list,
 * stats summary), which live in the zustand store instead.
 */

// vehicleId -> { current, previous, updatedAt }
const vehicles = new Map();

let lastBatchAt = Date.now();
let pointsInLastSecond = 0;
let throughputWindowStart = Date.now();
let throughputCounter = 0;
let currentThroughput = 0;

export function ingestBatch(batch) {
  const now = Date.now();
  for (const point of batch) {
    const existing = vehicles.get(point.vehicleId);
    vehicles.set(point.vehicleId, {
      previous: existing ? existing.current : point,
      current: point,
      updatedAt: now,
    });
  }
  lastBatchAt = now;
  pointsInLastSecond = batch.length;

  throughputCounter += batch.length;
  if (now - throughputWindowStart >= 1000) {
    currentThroughput = throughputCounter;
    throughputCounter = 0;
    throughputWindowStart = now;
  }
}

export function hydrateSnapshot(snapshotArray) {
  const now = Date.now();
  for (const point of snapshotArray) {
    vehicles.set(point.vehicleId, { previous: point, current: point, updatedAt: now });
  }
}

export function getAllVehicles() {
  return vehicles;
}

export function getVehicle(vehicleId) {
  return vehicles.get(vehicleId);
}

export function getVehicleCount() {
  return vehicles.size;
}

export function getThroughput() {
  return currentThroughput;
}

export function getLastBatchAt() {
  return lastBatchAt;
}

export function clearBuffer() {
  vehicles.clear();
}
