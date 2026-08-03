import mongoose from 'mongoose';
import { TelemetryBucket, hourBucketKey } from '../models/TelemetryBucket.js';
import { config } from '../config/index.js';

// In-memory fallback store, keyed by `${vehicleId}:${bucketHour}`, used when
// Mongo isn't connected — keeps the demo fully self-contained while mirroring
// the exact same bucket shape you'd get from Mongo.
const memoryBuckets = new Map();

function writeToMemory(point) {
  const bucketHour = hourBucketKey(point.timestamp);
  const key = `${point.vehicleId}:${bucketHour}`;
  const existing = memoryBuckets.get(key) || {
    vehicleId: point.vehicleId,
    bucketHour,
    points: [],
    firstTimestamp: point.timestamp,
    lastTimestamp: point.timestamp,
  };

  existing.points.push(point);
  existing.lastTimestamp = point.timestamp;
  if (existing.points.length > config.bucket.maxPointsPerBucket) {
    existing.points.shift(); // bound memory use in the demo store
  }
  memoryBuckets.set(key, existing);
}

async function writeToMongo(point) {
  const bucketHour = hourBucketKey(point.timestamp);
  const { vehicleId, ...rest } = point;

  await TelemetryBucket.updateOne(
    { vehicleId, bucketHour },
    {
      $push: {
        points: {
          $each: [{ ...rest, t: point.timestamp }],
          $slice: -config.bucket.maxPointsPerBucket, // keep bucket bounded
        },
      },
      $inc: { pointCount: 1 },
      $min: { firstTimestamp: point.timestamp },
      $max: { lastTimestamp: point.timestamp },
      $setOnInsert: { vehicleId, bucketHour },
    },
    { upsert: true }
  );
}

/** Persists a batch of normalized telemetry points using the Bucket Pattern. */
export async function persistBatch(points) {
  if (mongoose.connection.readyState === 1) {
    // Fire-and-forget-ish, but we await Promise.all so back-pressure is visible.
    await Promise.all(points.map((p) => writeToMongo(p).catch((err) => console.error('[bucketWriter] mongo write failed', err.message))));
  } else {
    for (const p of points) writeToMemory(p);
  }
}

/** For the REST API / demo inspection — returns recent buckets for a vehicle. */
export function getMemoryBucketsForVehicle(vehicleId) {
  return Array.from(memoryBuckets.values()).filter((b) => b.vehicleId === vehicleId);
}
