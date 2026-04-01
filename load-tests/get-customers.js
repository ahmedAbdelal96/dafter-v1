/**
 * [INFRA-8] Load Test — GET /api/v1/customers
 *
 * Target: 100 VUs for 60 seconds
 * Thresholds:
 *   - p(95) < 600ms
 *   - error rate < 1%
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { login, authHeaders, BASE_URL } from './helpers.js';

const customersDuration = new Trend('customers_duration', true);
const customersErrors = new Rate('customers_errors');

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '40s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
    customers_errors: ['rate<0.01'],
  },
};

export function setup() {
  return { token: login() };
}

export default function (data) {
  // Vary page to simulate realistic usage
  const page = Math.ceil(Math.random() * 5);
  const res = http.get(
    `${BASE_URL}/api/v1/customers?page=${page}&limit=20`,
    authHeaders(data.token),
  );

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has data array': (r) => Array.isArray(r.json('data')),
  });

  customersDuration.add(res.timings.duration);
  customersErrors.add(!ok);

  sleep(0.5);
}
