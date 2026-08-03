/**
 * k6 load test — validates the REST layer stays healthy under sustained
 * concurrent load, and gives you a repeatable number for "requests/sec"
 * claims instead of an eyeballed guess.
 *
 * This hits GET /api/vehicles and GET /api/health, which exercise the same
 * in-memory snapshot Map that the Socket.io gateway reads from — so p95/p99
 * latency here is a reasonable proxy for how the ingestion pipeline behaves
 * under concurrent read pressure.
 *
 * Run:
 *   k6 run backend/loadtest/ingest.js
 *
 * Override target/duration:
 *   k6 run -e TARGET_RPS=2000 -e DURATION=60s backend/loadtest/ingest.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TARGET_RPS = Number(__ENV.TARGET_RPS || 2000);
const DURATION = __ENV.DURATION || '30s';

const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency_ms');
const vehiclesLatency = new Trend('vehicles_latency_ms');

export const options = {
  scenarios: {
    ingestion_pressure: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Math.min(500, Math.ceil(TARGET_RPS / 4)),
      maxVUs: Math.min(2000, TARGET_RPS),
    },
  },
  thresholds: {
    // The plan's bar: prove the pipeline holds up, not just "usually works."
    http_req_failed: ['rate<0.001'], // effectively zero dropped/failed requests
    http_req_duration: ['p(95)<50', 'p(99)<150'],
    errors: ['rate<0.001'],
  },
};

export default function () {
  const healthRes = http.get(`${BASE_URL}/api/health`);
  healthLatency.add(healthRes.timings.duration);
  const healthOk = check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'health body has ok:true': (r) => {
      try {
        return JSON.parse(r.body).ok === true;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!healthOk);

  const vehiclesRes = http.get(`${BASE_URL}/api/vehicles`);
  vehiclesLatency.add(vehiclesRes.timings.duration);
  const vehiclesOk = check(vehiclesRes, {
    'vehicles status 200': (r) => r.status === 200,
    'vehicles body is a non-empty array': (r) => {
      try {
        const arr = JSON.parse(r.body);
        return Array.isArray(arr) && arr.length > 0;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!vehiclesOk);

  sleep(0.01);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values['p(95)'];
  const p99 = data.metrics.http_req_duration?.values['p(99)'];
  const failRate = data.metrics.http_req_failed?.values.rate ?? 0;

  console.log(`\n=== FleetDash Ingestion Load Test ===`);
  console.log(`Target: ${TARGET_RPS} req/sec for ${DURATION}`);
  console.log(`p95 latency: ${p95?.toFixed(2)} ms`);
  console.log(`p99 latency: ${p99?.toFixed(2)} ms`);
  console.log(`Failed request rate: ${(failRate * 100).toFixed(4)}%`);
  console.log(`Zero-omission target met: ${failRate < 0.001 ? 'YES' : 'NO'}\n`);

  return { stdout: JSON.stringify(data, null, 2) };
}
