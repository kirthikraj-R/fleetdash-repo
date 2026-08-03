import * as turf from '@turf/turf';
import { config } from '../config/index.js';
import { HUBS } from '../config/hubs.js';

/**
 * Geospatial Rules engine.
 *
 * Keeps an in-memory working set of geofence polygons (loaded from Mongo at
 * startup if persistence is enabled, otherwise from the seed set below) and
 * tracks each vehicle's last known "inside which zones" state so we only
 * emit an event on a state *transition* (enter/exit) rather than on every
 * single ping — that's what turns raw coordinates into meaningful alerts.
 */

const zones = new Map(); // id -> { id, name, kind, color, feature }
const vehicleZoneState = new Map(); // vehicleId -> Set<zoneId>

const KIND_CYCLE = [
  { kind: 'depot', color: '#3DDC84', suffix: 'Depot', radiusKm: 3 },
  { kind: 'delivery', color: '#4FD8E0', suffix: 'Delivery Zone', radiusKm: 4 },
  { kind: 'restricted', color: '#FF5C5C', suffix: 'Restricted Zone', radiusKm: 2.5 },
  { kind: 'custom', color: '#FFB020', suffix: 'Ops Zone', radiusKm: 3.5 },
];

function seedDemoZones() {
  // One geofence per major hub region, cycling through zone kinds, so every
  // part of the country-wide fleet has something local to breach — used
  // when Mongo isn't connected / no zones have been created yet.
  HUBS.forEach((hub, i) => {
    const preset = KIND_CYCLE[i % KIND_CYCLE.length];
    // Small offset from the exact hub center so the zone isn't perfectly
    // concentric with the vehicle cluster's midpoint — reads more like a
    // real facility near the city rather than a ring around its centroid.
    const center = [hub.lng + 0.03, hub.lat + 0.02];
    const circle = turf.circle(center, preset.radiusKm, { units: 'kilometers', steps: 48 });
    addZone({
      id: `zone-${hub.name.toLowerCase()}`,
      name: `${hub.name} ${preset.suffix}`,
      kind: preset.kind,
      color: preset.color,
      geometry: circle.geometry,
    });
  });
}

export function addZone({ id, name, kind = 'custom', color = '#FFB020', geometry }) {
  const feature = turf.feature(geometry);
  zones.set(id, { id, name, kind, color, feature });
  return zones.get(id);
}

export function removeZone(id) {
  return zones.delete(id);
}

export function listZones() {
  return Array.from(zones.values()).map(({ id, name, kind, color, feature }) => ({
    id,
    name,
    kind,
    color,
    geometry: feature.geometry,
  }));
}

/**
 * Checks a single point against all zones and returns any enter/exit
 * transitions since this vehicle's last known state.
 */
export function evaluatePoint(vehicleId, lng, lat) {
  const point = turf.point([lng, lat]);
  const currentlyInside = new Set();

  for (const zone of zones.values()) {
    if (turf.booleanPointInPolygon(point, zone.feature)) {
      currentlyInside.add(zone.id);
    }
  }

  const previouslyInside = vehicleZoneState.get(vehicleId) || new Set();
  const events = [];

  for (const zoneId of currentlyInside) {
    if (!previouslyInside.has(zoneId)) {
      const zone = zones.get(zoneId);
      events.push({ type: 'ENTER', vehicleId, zoneId, zoneName: zone.name, zoneKind: zone.kind, lat, lng, timestamp: Date.now() });
    }
  }
  for (const zoneId of previouslyInside) {
    if (!currentlyInside.has(zoneId)) {
      const zone = zones.get(zoneId);
      if (zone) {
        events.push({ type: 'EXIT', vehicleId, zoneId, zoneName: zone.name, zoneKind: zone.kind, lat, lng, timestamp: Date.now() });
      }
    }
  }

  vehicleZoneState.set(vehicleId, currentlyInside);
  return events;
}

seedDemoZones();
