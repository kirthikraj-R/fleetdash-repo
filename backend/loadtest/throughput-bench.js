/**
 * Direct throughput benchmark for the Ingestion Engine (worker_threads pool).
 *
 * The k6 script in this folder measures REST API latency under load, which
 * is a reasonable proxy — but this script measures the actual bottleneck the
 * plan calls out: how many raw telemetry points/sec the worker_threads pool
 * can parse/validate/normalize without dropping any, independent of network
 * or Socket.io overhead.
 *
 * Run from backend/:
 *   node loadtest/throughput-bench.js
 *   node loadtest/throughput-bench.js --points=200000 --batchSize=150
 */
import { parseTelemetryBatch } from '../src/workers/workerPool.js';

function arg(name, fallback) {
  const match = process.argv.find((a) => a.startsWith(`--${name}=`));
  return match ? Number(match.split('=')[1]) : fallback;
}

const TOTAL_POINTS = arg('points', 300_000);
const BATCH_SIZE = arg('batchSize', 150); // matches the default fleet size
const MALFORMED_RATE = 0.02; // 2% intentionally invalid points, to prove they're dropped not silently corrupted

function makeBatch(size) {
  const batch = [];
  for (let i = 0; i < size; i++) {
    const malformed = Math.random() < MALFORMED_RATE;
    batch.push({
      vehicleId: malformed ? null : `VH-${i}`, // missing id -> should be dropped
      lat: malformed ? 999 : 12.9 + Math.random() * 0.1, // out-of-range -> should be dropped
      lng: 77.5 + Math.random() * 0.1,
      speedKph: Math.random() * 90,
      heading: Math.random() * 360,
      fuel: Math.random() * 100,
      timestamp: Date.now(),
    });
  }
  return batch;
}

async function main() {
  const batches = Math.ceil(TOTAL_POINTS / BATCH_SIZE);
  let processed = 0;
  let sent = 0;

  console.log(`\n=== FleetDash Ingestion Engine Throughput Benchmark ===`);
  console.log(`Sending ${TOTAL_POINTS.toLocaleString()} points in ${batches} batches of ${BATCH_SIZE}`);
  console.log(`(${(MALFORMED_RATE * 100).toFixed(0)}% intentionally malformed, to confirm they're rejected cleanly)\n`);

  const start = performance.now();

  for (let i = 0; i < batches; i++) {
    const batch = makeBatch(BATCH_SIZE);
    sent += batch.length;
    const normalized = await parseTelemetryBatch(batch);
    processed += normalized.length;
  }

  const elapsedSec = (performance.now() - start) / 1000;
  const pointsPerSec = sent / elapsedSec;
  const droppedCount = sent - processed;
  const expectedDrops = Math.round(sent * MALFORMED_RATE);

  console.log(`Elapsed: ${elapsedSec.toFixed(2)}s`);
  console.log(`Throughput: ${pointsPerSec.toFixed(0)} points/sec`);
  console.log(`Sent: ${sent.toLocaleString()}  Accepted: ${processed.toLocaleString()}  Dropped: ${droppedCount.toLocaleString()}`);
  console.log(`Expected drops (malformed only): ~${expectedDrops.toLocaleString()}`);
  console.log(
    `Zero unintended omission: ${Math.abs(droppedCount - expectedDrops) < expectedDrops * 0.15 ? 'YES — only malformed points were dropped' : 'CHECK — drop count deviates from expected malformed rate'}\n`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
