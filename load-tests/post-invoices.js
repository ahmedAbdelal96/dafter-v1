/**
 * [INFRA-8] Load Test — POST /api/v1/invoices
 *
 * Target: 50 VUs for 60 seconds (write endpoint — lower concurrency)
 * Thresholds:
 *   - p(95) < 1200ms
 *   - error rate < 2%
 *
 * Requires a valid customerId in the AUTH_CUSTOMER_ID env var,
 * OR the test will attempt to fetch the first customer automatically.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { login, authHeaders, BASE_URL } from './helpers.js';

const invoiceDuration = new Trend('invoice_create_duration', true);
const invoiceErrors = new Rate('invoice_create_errors');

export const options = {
  stages: [
    { duration: '10s', target: 25 },  // ramp up
    { duration: '40s', target: 50 },  // hold at 50 VUs
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.02'],
    invoice_create_errors: ['rate<0.02'],
  },
};

export function setup() {
  const token = login();

  // Fetch a customer ID to use in invoices
  let customerId = __ENV.AUTH_CUSTOMER_ID;
  if (!customerId) {
    const res = http.get(
      `${BASE_URL}/api/v1/customers?page=1&limit=1`,
      authHeaders(token),
    );
    const body = res.json();
    const items = Array.isArray(body.data) ? body.data : [];
    customerId = items[0]?.id ?? null;
  }

  if (!customerId) {
    console.error('No customer found — create at least one customer before running this test');
    console.error('Or set AUTH_CUSTOMER_ID env var to a valid UUID');
  }

  return { token, customerId };
}

export default function (data) {
  if (!data.customerId) {
    invoiceErrors.add(1);
    sleep(1);
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  // Generate slightly varied amounts to avoid caching effects
  const unitPrice = (Math.random() * 900 + 100).toFixed(2);

  const payload = JSON.stringify({
    partyType: 'CUSTOMER',
    partyId: data.customerId,
    issueDate: today,
    items: [
      {
        description: `Load test item ${__VU}-${__ITER}`,
        quantity: 1,
        unitPrice: parseFloat(unitPrice),
      },
    ],
    notes: 'k6 load test — safe to delete',
  });

  const res = http.post(
    `${BASE_URL}/api/v1/invoices`,
    payload,
    authHeaders(data.token),
  );

  const ok = check(res, {
    'status 201': (r) => r.status === 201,
    'has invoice id': (r) => !!r.json('data.id'),
  });

  invoiceDuration.add(res.timings.duration);
  invoiceErrors.add(!ok);

  // Longer sleep for write operations
  sleep(1);
}
