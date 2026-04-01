const API_BASE = process.env.WEB_SMOKE_API_BASE || "http://localhost:7000/api/v1";
const EMAIL = process.env.WEB_SMOKE_EMAIL || "owner@daftar.com";
const PASSWORD = process.env.WEB_SMOKE_PASSWORD || "owner123";

function fail(message) {
  console.error(`[invoice-lifecycle-smoke] ${message}`);
  process.exit(1);
}

async function request(path, { method = "GET", token, companyId, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers["x-company-id"] = companyId;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
}

async function login() {
  const { response, payload } = await request("/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });

  if (!response.ok) {
    fail(`login failed (${response.status}) ${JSON.stringify(payload)}`);
  }

  const token = payload?.data?.tokens?.accessToken;
  const companyId = payload?.data?.user?.companyId;
  if (!token || !companyId) {
    fail("login response missing token or companyId");
  }

  return { token, companyId };
}

function extractItems(payload) {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function main() {
  const { token, companyId } = await login();
  const list = await request("/invoices?page=1&limit=50", { token, companyId });
  if (!list.response.ok) {
    fail(`invoices list failed (${list.response.status})`);
  }

  const invoices = extractItems(list.payload);
  if (invoices.length === 0) {
    fail("no invoices available for smoke check");
  }

  const draft = invoices.find((inv) => inv.status === "DRAFT");
  if (!draft?.id) {
    fail("no draft invoice available for lifecycle happy path");
  }

  const submitRes = await request(`/invoices/${draft.id}/submit`, {
    method: "PATCH",
    token,
    companyId,
  });
  if (![200, 403].includes(submitRes.response.status)) {
    fail(`submit returned unexpected status (${submitRes.response.status})`);
  }

  const approveRes = await request(`/invoices/${draft.id}/approve`, {
    method: "PATCH",
    token,
    companyId,
  });
  if (!approveRes.response.ok) {
    fail(`approve failed (${approveRes.response.status})`);
  }

  const paymentRes = await request(`/invoices/${draft.id}/payments`, {
    method: "POST",
    token,
    companyId,
    body: { amount: 1, method: "CASH", note: "smoke payment" },
  });
  if (![200, 201, 400, 403, 409].includes(paymentRes.response.status)) {
    fail(`record payment returned unexpected status (${paymentRes.response.status})`);
  }

  const cancelRes = await request(`/invoices/${draft.id}/cancel`, {
    method: "PATCH",
    token,
    companyId,
  });
  if (!cancelRes.response.ok) {
    fail(`cancel failed (${cancelRes.response.status})`);
  }

  const rejectAfterCancelRes = await request(`/invoices/${draft.id}/reject`, {
    method: "PATCH",
    token,
    companyId,
  });

  if (rejectAfterCancelRes.response.ok) {
    fail("invalid transition check failed: reject after cancel unexpectedly succeeded");
  }

  const expectedInvalidTransitionStatuses = new Set([400, 403, 409]);
  if (!expectedInvalidTransitionStatuses.has(rejectAfterCancelRes.response.status)) {
    fail(
      `invalid transition returned unexpected status (${rejectAfterCancelRes.response.status})`
    );
  }

  console.log("Invoice lifecycle smoke check passed.");
}

main().catch((error) => {
  fail(`unexpected error: ${error?.message || error}`);
});
