/**
 * Shared helpers for Daftar load tests
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:7000';
const AUTH_EMAIL = __ENV.AUTH_EMAIL || 'owner@example.com';
const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || 'Test@12345';

/**
 * Login and return Bearer token.
 * Call once in setup(), pass token to default() via scenario data.
 */
export function login() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'login 200': (r) => r.status === 200 });

  const body = res.json();
  return body.data?.accessToken ?? '';
}

export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

export { BASE_URL };
