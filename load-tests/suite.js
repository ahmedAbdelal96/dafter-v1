/**
 * [INFRA-8] Full Load Test Suite — Daftar v1
 *
 * Runs all 3 scenarios in parallel using k6 scenarios.
 * Each scenario has independent VU pools and thresholds.
 *
 * Usage:
 *   BASE_URL=http://localhost:7000 \
 *   AUTH_EMAIL=owner@example.com \
 *   AUTH_PASSWORD=Test@12345 \
 *   k6 run load-tests/suite.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { login, authHeaders, BASE_URL } from './helpers.js';

// ── Custom metrics ─────────────────────────────────────────────────────────────
const dashboardDuration = new Trend('dashboard_duration', true);
const customersDuration = new Trend('customers_duration', true);
const invoiceDuration = new Trend('invoice_create_duration', true);
const dashboardErrors = new Rate('dashboard_errors');
const customersErrors = new Rate('customers_errors');
const invoiceErrors = new Rate('invoice_create_errors');

// ── Scenario config ────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    dashboard_load: {
      executor: 'ramping-vus',
      exec: 'dashboardScenario',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '40s', target: 100 },
        { duration: '10s', target: 0 },
      ],
    },
    customers_load: {
      executor: 'ramping-vus',
      exec: 'customersScenario',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '40s', target: 100 },
        { duration: '10s', target: 0 },
      ],
    },
    invoices_load: {
      executor: 'ramping-vus',
      exec: 'invoicesScenario',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 25 },
        { duration: '40s', target: 50 },
        { duration: '10s', target: 0 },
      ],
    },
  },

  thresholds: {
    // Global HTTP thresholds
    http_req_failed: ['rate<0.02'],

    // Per-scenario thresholds
    dashboard_duration: ['p(95)<800'],
    customers_duration: ['p(95)<600'],
    invoice_create_duration: ['p(95)<1200'],

    dashboard_errors: ['rate<0.01'],
    customers_errors: ['rate<0.01'],
    invoice_create_errors: ['rate<0.02'],
  },
};

// ── Setup: login once, shared by all scenarios ─────────────────────────────────
export function setup() {
  const token = login();

  // Fetch a customer ID for invoice creation
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

  return { token, customerId };
}

// ── Scenario functions ─────────────────────────────────────────────────────────

export function dashboardScenario(data) {
  const res = http.get(`${BASE_URL}/api/v1/dashboard`, authHeaders(data.token));
  const ok = check(res, { 'dashboard 200': (r) => r.status === 200 });
  dashboardDuration.add(res.timings.duration);
  dashboardErrors.add(!ok);
  sleep(0.5);
}

export function customersScenario(data) {
  const page = Math.ceil(Math.random() * 5);
  const res = http.get(
    `${BASE_URL}/api/v1/customers?page=${page}&limit=20`,
    authHeaders(data.token),
  );
  const ok = check(res, {
    'customers 200': (r) => r.status === 200,
    'customers array': (r) => Array.isArray(r.json('data')),
  });
  customersDuration.add(res.timings.duration);
  customersErrors.add(!ok);
  sleep(0.5);
}

export function invoicesScenario(data) {
  if (!data.customerId) {
    invoiceErrors.add(1);
    sleep(1);
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const unitPrice = (Math.random() * 900 + 100).toFixed(2);

  const res = http.post(
    `${BASE_URL}/api/v1/invoices`,
    JSON.stringify({
      partyType: 'CUSTOMER',
      partyId: data.customerId,
      issueDate: today,
      items: [
        {
          description: `Suite test item ${__VU}-${__ITER}`,
          quantity: 1,
          unitPrice: parseFloat(unitPrice),
        },
      ],
      notes: 'k6 suite test — safe to delete',
    }),
    authHeaders(data.token),
  );

  const ok = check(res, {
    'invoice 201': (r) => r.status === 201,
    'invoice id': (r) => !!r.json('data.id'),
  });

  invoiceDuration.add(res.timings.duration);
  invoiceErrors.add(!ok);
  sleep(1);
}
