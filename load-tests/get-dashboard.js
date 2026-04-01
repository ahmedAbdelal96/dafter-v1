/**
 * [INFRA-8] Load Test — GET /api/v1/dashboard
 *
 * Target: 100 VUs for 60 seconds
 * Thresholds:
 *   - p(95) < 800ms
 *   - error rate < 1%
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { login, authHeaders, BASE_URL } from './helpers.js';

const dashboardDuration = new Trend('dashboard_duration', true);
const dashboardErrors = new Rate('dashboard_errors');

export const options = {
  stages: [
    { duration: '10s', target: 50 },   // ramp up
    { duration: '40s', target: 100 },  // hold at 100 VUs
    { duration: '10s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    dashboard_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: login() };
}

export default function (data) {
  const res = http.get(
    `${BASE_URL}/api/v1/dashboard`,
    authHeaders(data.token),
  );

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => r.json('data') !== null,
  });

  dashboardDuration.add(res.timings.duration);
  dashboardErrors.add(!ok);

  sleep(0.5); // ~120 RPS sustained at 100 VUs
}
