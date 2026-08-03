import 'dotenv/config';

export const config = {
  port: process.env.PORT || 4000,

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fleetdash',
    enabled: process.env.MONGO_ENABLED === 'true', // off by default for zero-setup demo
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    enabled: process.env.REDIS_ENABLED === 'true', // off by default; falls back to in-process EventEmitter bus
  },

  simulation: {
    // Demo mode spins up a synthetic fleet so the dashboard is alive with zero external setup.
    enabled: process.env.SIMULATION_ENABLED !== 'false',
    vehicleCount: Number(process.env.SIM_VEHICLE_COUNT || 150),
    tickMs: Number(process.env.SIM_TICK_MS || 250),
  },

  bucket: {
    // Bucket Pattern: one document per vehicle per hour, points appended to an array.
    maxPointsPerBucket: Number(process.env.BUCKET_MAX_POINTS || 3600),
  },
};
