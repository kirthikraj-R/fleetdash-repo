import express from 'express';
import cors from 'cors';
import { buildApiRouter } from './routes/api.js';

/**
 * Builds the Express app in isolation from the rest of the server's startup
 * (Mongo, Redis, Socket.io, the simulator). Split out specifically so tests
 * can `import { createApp } from './app.js'` and hit routes with Supertest
 * without needing a real database, broker, or open socket connections.
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // In-memory snapshot of the latest known state per vehicle. server.js
  // populates this from the message bus; tests populate it directly.
  const fleetSnapshot = new Map();

  function getFleetSnapshot() {
    return Array.from(fleetSnapshot.values());
  }

  app.use('/api', buildApiRouter({ getFleetSnapshot }));

  return { app, fleetSnapshot, getFleetSnapshot };
}
