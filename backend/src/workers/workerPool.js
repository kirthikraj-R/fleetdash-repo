import Piscina from 'piscina';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const workerFile = fileURLToPath(new URL('./parserWorker.js', import.meta.url));

/**
 * A shared pool of worker_threads used to offload coordinate parsing from
 * the main event loop. Sized to leave headroom for the main thread (which is
 * doing Socket.io I/O, not CPU work) so we don't starve it.
 */
export const parserPool = new Piscina({
  filename: workerFile,
  minThreads: 2,
  maxThreads: Math.max(2, Math.floor(os.cpus().length / 2)),
  idleTimeout: 30_000,
});

/**
 * Parses a batch of raw telemetry records on a worker thread.
 * @param {Array<object>} batch
 * @returns {Promise<Array<object>>}
 */
export async function parseTelemetryBatch(batch) {
  if (batch.length === 0) return [];
  return parserPool.run(batch);
}
