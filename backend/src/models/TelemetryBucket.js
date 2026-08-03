import mongoose from 'mongoose';

/**
 * Bucket Pattern
 * ---------------
 * Instead of one document per GPS ping (which at thousands of
 * vehicles x multiple pings/sec would create an enormous number of tiny
 * documents and shred your index), we group every point emitted by a single
 * vehicle within a single UTC hour into one document, with points appended
 * to a bounded array.
 *
 * Benefits:
 *  - Far fewer documents -> smaller indexes, cheaper writes (append to array
 *    vs insert new document), better cache locality for "give me this
 *    vehicle's last hour" queries.
 *  - `pointCount` + `first`/`last` timestamps let you answer range queries
 *    without scanning the array.
 *  - A TTL-friendly `expiresAt` field lets you auto-age out raw telemetry
 *    once it's been rolled up into longer-term aggregates elsewhere.
 */
const PointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speedKph: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    fuel: { type: Number, default: null },
    status: { type: String, default: 'active' },
    t: { type: Number, required: true }, // epoch ms
  },
  { _id: false }
);

const TelemetryBucketSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, index: true },
  // Hour bucket key, e.g. "2026-07-14T09" — one document per vehicle per hour.
  bucketHour: { type: String, required: true, index: true },
  points: { type: [PointSchema], default: [] },
  pointCount: { type: Number, default: 0 },
  firstTimestamp: { type: Number },
  lastTimestamp: { type: Number },
  // Auto-expire raw buckets after 7 days; adjust/remove once you have a
  // downstream rollup job persisting long-term aggregates.
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    index: { expires: 0 },
  },
});

TelemetryBucketSchema.index({ vehicleId: 1, bucketHour: 1 }, { unique: true });

export const TelemetryBucket =
  mongoose.models.TelemetryBucket || mongoose.model('TelemetryBucket', TelemetryBucketSchema);

/** Returns the current UTC hour bucket key for a timestamp, e.g. "2026-07-14T09". */
export function hourBucketKey(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().slice(0, 13);
}
