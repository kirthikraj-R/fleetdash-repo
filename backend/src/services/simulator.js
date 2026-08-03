import { config } from '../config/index.js';
import { HUBS } from '../config/hubs.js';

/**
 * Generates a synthetic fleet spread across major Indian cities, each
 * vehicle wandering realistically around its assigned hub (a city-scale
 * delivery/patrol radius), so FleetDash is fully alive with a genuine
 * nationwide spread — without needing real GPS hardware or a data provider
 * hooked up. Swap this out for your real ingestion source (MQTT, HTTP
 * webhook, Kafka consumer, etc.) — everything downstream (worker pool ->
 * bus -> sockets) is unchanged.
 */

const FLEET_TYPES = ['van', 'truck', 'bike', 'refrigerated'];

// Roughly 1 in 5 vehicles are parked/idle rather than actively driving —
// gives the map (and the idle count on the dashboard) a realistic mix
// instead of every vehicle being in motion all the time.
const IDLE_RATIO = 0.2;

// A pool of realistic Indian driver names, cycled deterministically per
// vehicle rather than a generic "Driver 42" placeholder.
const FIRST_NAMES = [
  'Ravi', 'Priya', 'Arjun', 'Ananya', 'Vikram', 'Sneha', 'Rohan', 'Kavita',
  'Suresh', 'Meera', 'Arun', 'Divya', 'Karan', 'Pooja', 'Manoj', 'Neha',
  'Sanjay', 'Anjali', 'Deepak', 'Ritu', 'Ajay', 'Swati', 'Vijay', 'Nisha',
  'Amit', 'Rekha', 'Rahul', 'Shreya', 'Naveen', 'Lakshmi',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Singh', 'Gupta',
  'Kumar', 'Rao', 'Mehta', 'Joshi', 'Menon', 'Chauhan', 'Kapoor', 'Desai',
  'Pillai', 'Bhatt', 'Malhotra', 'Chatterjee',
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function driverName(index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

/** Bearing (degrees, 0 = north) from one point to another — matches this file's movement convention. */
function bearingTo(fromLat, fromLng, toLat, toLng) {
  const cosLat = Math.cos((fromLat * Math.PI) / 180);
  const dLat = toLat - fromLat;
  const dLng = (toLng - fromLng) * cosLat;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function makeVehicle(index) {
  const hub = HUBS[index % HUBS.length];
  const angle = randomBetween(0, Math.PI * 2);
  const radius = randomBetween(0.02, 0.12); // roughly ~2-13km city-scale spread around the hub
  const maxRadiusDeg = 0.16; // ~18km leash — keeps each hub's vehicles visually distinct on a country-wide view

  // A deterministic-ish slice of the fleet starts (and stays) parked —
  // real depots always have some vehicles idle, not every truck is rolling
  // at once.
  const startsIdle = (index % Math.round(1 / IDLE_RATIO)) === 0;

  return {
    vehicleId: `VH-${String(index).padStart(4, '0')}`,
    type: FLEET_TYPES[index % FLEET_TYPES.length],
    driver: driverName(index),
    hub,
    maxRadiusDeg,
    lat: hub.lat + radius * Math.sin(angle),
    lng: hub.lng + radius * Math.cos(angle),
    heading: randomBetween(0, 360),
    speedKph: startsIdle ? 0 : randomBetween(10, 70),
    fuel: randomBetween(35, 100),
    isIdle: startsIdle,
    // Each vehicle gets its own turn radius / wander so the fleet doesn't
    // move in obvious lockstep.
    turnBias: randomBetween(-4, 4),
  };
}

export class FleetSimulator {
  constructor(onBatch) {
    this.onBatch = onBatch;
    this.vehicles = Array.from({ length: config.simulation.vehicleCount }, (_, i) => makeVehicle(i + 1));
    this.timer = null;
  }

  step() {
    const batch = [];
    for (const v of this.vehicles) {
      if (v.isIdle) {
        // Parked: negligible drift (GPS jitter), no real movement, fuel
        // ticks down far slower than a moving vehicle.
        v.lat += randomBetween(-0.00002, 0.00002);
        v.lng += randomBetween(-0.00002, 0.00002);
        v.speedKph = 0;
        v.fuel = Math.max(0, v.fuel - randomBetween(0, 0.001));
      } else {
        // If a vehicle has wandered too far from its assigned city hub,
        // bias its heading back toward the hub instead of letting it
        // random-walk indefinitely — keeps each city's fleet visually
        // distinct on a countrywide map instead of everything eventually
        // drifting together (or off into the ocean) over a long session.
        const distFromHub = Math.hypot(v.lat - v.hub.lat, v.lng - v.hub.lng);
        if (distFromHub > v.maxRadiusDeg) {
          const bearing = bearingTo(v.lat, v.lng, v.hub.lat, v.hub.lng);
          v.heading = (bearing + randomBetween(-25, 25) + 360) % 360;
        } else {
          v.heading = (v.heading + v.turnBias + randomBetween(-2, 2) + 360) % 360;
        }

        v.speedKph = Math.min(90, Math.max(5, v.speedKph + randomBetween(-3, 3)));

        const distanceKm = (v.speedKph * (config.simulation.tickMs / 1000)) / 3600;
        const rad = (v.heading * Math.PI) / 180;
        // Rough planar approximation is fine at demo scale/zoom.
        v.lat += (distanceKm / 111) * Math.cos(rad);
        v.lng += (distanceKm / (111 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin(rad);

        v.fuel = Math.max(0, v.fuel - randomBetween(0, 0.01));
      }

      batch.push({
        vehicleId: v.vehicleId,
        lat: v.lat,
        lng: v.lng,
        speedKph: v.speedKph,
        heading: v.heading,
        fuel: v.fuel,
        status: v.isIdle || v.speedKph < 3 ? 'idle' : 'active',
        timestamp: Date.now(),
        meta: { type: v.type, driver: v.driver, hub: v.hub.name },
      });
    }
    this.onBatch(batch);
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), config.simulation.tickMs);
    const idleCount = this.vehicles.filter((v) => v.isIdle).length;
    console.log(
      `[simulator] started: ${this.vehicles.length} vehicles across ${HUBS.length} Indian cities @ ${config.simulation.tickMs}ms tick ` +
        `(${idleCount} parked/idle, ${Math.round((this.vehicles.length * 1000) / config.simulation.tickMs)} pts/sec)`
    );
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
}
