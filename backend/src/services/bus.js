import { EventEmitter } from 'node:events';
import { config } from '../config/index.js';

/**
 * Message Broker abstraction.
 *
 * In production this is backed by Redis Pub/Sub (or Redis Streams if you need
 * replay / at-least-once delivery — see the note in README.md). It decouples
 * the Ingestion Engine from every Socket.io gateway process, so you can run
 * N ingestion workers and M socket gateways behind a load balancer and every
 * gateway still sees every event.
 *
 * For local/demo use (no Redis installed) it transparently falls back to an
 * in-process EventEmitter bus with the exact same publish/subscribe surface,
 * so the rest of the codebase never has to know which one it's talking to.
 */

class InMemoryBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  async publish(channel, payload) {
    this.emitter.emit(channel, payload);
    return true;
  }

  subscribe(channel, handler) {
    this.emitter.on(channel, handler);
    return () => this.emitter.off(channel, handler);
  }
}

class RedisBus {
  constructor(url) {
    // Imported lazily so ioredis is only required when Redis is actually enabled.
    this.url = url;
    this.handlers = new Map();
  }

  async connect() {
    const { default: Redis } = await import('ioredis');
    this.pub = new Redis(this.url);
    this.sub = new Redis(this.url);
    this.sub.on('message', (channel, message) => {
      const set = this.handlers.get(channel);
      if (!set) return;
      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch {
        parsed = message;
      }
      for (const handler of set) handler(parsed);
    });
  }

  async publish(channel, payload) {
    return this.pub.publish(channel, JSON.stringify(payload));
  }

  subscribe(channel, handler) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      this.sub.subscribe(channel).catch((err) => {
        console.error(`[bus] failed to subscribe to ${channel}`, err);
      });
    }
    this.handlers.get(channel).add(handler);
    return () => this.handlers.get(channel)?.delete(handler);
  }
}

let busInstance;

export async function getBus() {
  if (busInstance) return busInstance;

  if (config.redis.enabled) {
    try {
      const redisBus = new RedisBus(config.redis.url);
      await redisBus.connect();
      console.log(`[bus] connected to Redis at ${config.redis.url}`);
      busInstance = redisBus;
      return busInstance;
    } catch (err) {
      console.warn('[bus] Redis unavailable, falling back to in-memory bus:', err.message);
    }
  } else {
    console.log('[bus] REDIS_ENABLED=false — using in-memory pub/sub bus (fine for single-process demo)');
  }

  busInstance = new InMemoryBus();
  return busInstance;
}

// Well-known channel names shared across the app.
export const CHANNELS = {
  TELEMETRY: 'fleet:telemetry',
  GEOFENCE_EVENT: 'fleet:geofence-event',
};
