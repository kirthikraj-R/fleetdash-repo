import http from 'node:http';
import { Server } from 'socket.io';
import msgpackParser from 'socket.io-msgpack-parser';

import { config } from './config/index.js';
import { connectMongo } from './db/mongo.js';
import { parseTelemetryBatch } from './workers/workerPool.js';
import { getBus, CHANNELS } from './services/bus.js';
import { evaluatePoint, listZones } from './services/geofenceService.js';
import { persistBatch } from './services/bucketWriter.js';
import { FleetSimulator } from './services/simulator.js';
import { createApp } from './app.js';

const { app, fleetSnapshot, getFleetSnapshot } = createApp();
const httpServer = http.createServer(app);

// Binary transport: msgpack instead of the default JSON parser roughly
// halves payload size for numeric-heavy telemetry frames, which matters a
// lot at thousands of points/sec fanned out to every connected dashboard.
const io = new Server(httpServer, {
  cors: { origin: '*' },
  parser: msgpackParser,
});

async function main() {
  await connectMongo();
  const bus = await getBus();

  // --- Socket.io gateway -----------------------------------------------
  // Subscribes to the message broker and fans out to every connected
  // client. This is intentionally decoupled from ingestion: you could run
  // this gateway as N horizontally-scaled processes behind a load balancer
  // (with sticky sessions) and every one of them would receive every event
  // via the shared bus, not just the process that happened to ingest it.
  bus.subscribe(CHANNELS.TELEMETRY, (batch) => {
    for (const point of batch) fleetSnapshot.set(point.vehicleId, point);
    io.volatile.emit('telemetry:batch', batch);
  });

  bus.subscribe(CHANNELS.GEOFENCE_EVENT, (event) => {
    io.emit('geofence:event', event); // not volatile — alerts must never be dropped
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id} (${io.engine.clientsCount} total)`);
    socket.emit('fleet:snapshot', getFleetSnapshot());
    socket.emit('geofence:zones', listZones());

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id} (${io.engine.clientsCount} total)`);
    });
  });

  // --- Ingestion Engine ---------------------------------------------------
  // Raw batch -> worker_threads pool (parse/validate/normalize, off the main
  // thread) -> geofence evaluation -> publish to bus -> persist via Bucket
  // Pattern. This is the same pipeline whether the raw batch comes from the
  // built-in simulator or a real device/webhook/MQTT source.
  async function ingest(rawBatch) {
    const normalized = await parseTelemetryBatch(rawBatch);
    if (normalized.length === 0) return;

    await bus.publish(CHANNELS.TELEMETRY, normalized);

    const geofenceEvents = [];
    for (const point of normalized) {
      const events = evaluatePoint(point.vehicleId, point.lng, point.lat);
      geofenceEvents.push(...events);
    }
    for (const event of geofenceEvents) {
      await bus.publish(CHANNELS.GEOFENCE_EVENT, event);
    }

    persistBatch(normalized).catch((err) => console.error('[ingest] persist failed', err.message));
  }

  if (config.simulation.enabled) {
    const simulator = new FleetSimulator(ingest);
    simulator.start();
  } else {
    console.log('[simulator] disabled — waiting for external telemetry source to call ingest()');
  }

  httpServer.listen(config.port, () => {
    console.log(`\n🚚  FleetDash backend listening on http://localhost:${config.port}`);
    console.log(`    REST API:     http://localhost:${config.port}/api`);
    console.log(`    Socket.io:    ws://localhost:${config.port}`);
    console.log(`    Simulation:   ${config.simulation.enabled ? 'ON' : 'OFF'}\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
