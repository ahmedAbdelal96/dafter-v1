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
  const list = await request("/sales/invoices?page=1&limit=50", { token, companyId });
  if (!list.response.ok) {
    fail(`sales invoices list failed (${list.response.status})`);
  }

  const invoices = extractItems(list.payload);
  if (invoices.length === 0) {
    fail("no sales invoices available for smoke check");
  }

  const draft = invoices.find((inv) => inv.status === "DRAFT");
  if (draft?.id) {
    const postRes = await request(`/sales/invoices/${draft.id}/post`, {
      method: "POST",
      token,
      companyId,
      body: {
        postingDate: new Date().toISOString().slice(0, 10),
        idempotencyKey: `web-smoke-${draft.id}`,
      },
    });
    if (!postRes.response.ok) {
      fail(`sales invoice post failed (${postRes.response.status})`);
    }
  } else if (!invoices.some((invoice) => invoice.status === "POSTED")) {
    fail("sales invoice list has neither a draft nor a posted invoice");
  }

  const postedInvoice = invoices.find((invoice) => invoice.status === "POSTED");
  if (postedInvoice?.businessPartnerId) {
    const openItems = await request(
      `/customer-payments/open-items?businessPartnerId=${postedInvoice.businessPartnerId}`,
      { token, companyId },
    );
    if (!openItems.response.ok) {
      fail(`AR open-items request failed (${openItems.response.status})`);
    }
  }

  console.log("Invoice lifecycle smoke check passed.");
}

main().catch((error) => {
  fail(`unexpected error: ${error?.message || error}`);
});
