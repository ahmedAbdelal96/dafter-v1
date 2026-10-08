const API_BASE = process.env.WEB_SMOKE_API_BASE || "http://localhost:7000/api/v1";
const EMAIL = process.env.WEB_SUPERADMIN_EMAIL || "superadmin@daftar.com";
const PASSWORD = process.env.WEB_SUPERADMIN_PASSWORD || "superadmin123";

function fail(message) {
  console.error(`[platform-governance-smoke] ${message}`);
  process.exit(1);
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

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
  if (!token) {
    fail("login response missing access token");
  }

  return token;
}

async function main() {
  const token = await login();

  const capabilitiesRes = await request("/platform/capabilities", { token });
  if (!capabilitiesRes.response.ok) {
    fail(`capabilities request failed (${capabilitiesRes.response.status})`);
  }
  if (typeof capabilitiesRes.payload?.data?.canHardDeleteCompany !== "boolean") {
    fail("capabilities payload missing canHardDeleteCompany boolean");
  }

  const companiesRes = await request("/platform/companies?page=1&limit=10", { token });
  if (!companiesRes.response.ok) {
    fail(`companies list failed (${companiesRes.response.status})`);
  }
  const companies = companiesRes.payload?.data?.companies;
  if (!Array.isArray(companies) || companies.length === 0) {
    fail("no companies available for archive/restore smoke");
  }

  const targetCompany = companies.find((company) => company?.isActive && !company?.isDeleted) ?? companies[0];
  if (!targetCompany?.id) {
    fail("failed to select target company");
  }

  const archiveRes = await request(`/platform/companies/${targetCompany.id}/archive`, {
    method: "PATCH",
    token,
    body: { reason: "governance smoke" },
  });
  if (!archiveRes.response.ok) {
    fail(`archive failed (${archiveRes.response.status})`);
  }

  const restoreRes = await request(`/platform/companies/${targetCompany.id}/restore`, {
    method: "PATCH",
    token,
    body: { reason: "governance smoke restore" },
  });
  if (!restoreRes.response.ok) {
    fail(`restore failed (${restoreRes.response.status})`);
  }

  const mutationPaths = [
    "/platform/subscriptions/activate",
    "/platform/subscriptions/suspend",
    "/platform/subscriptions/extend",
    "/platform/subscriptions/change-plan",
  ];

  for (const path of mutationPaths) {
    const mutationRes = await request(path, { method: "POST", token, body: {} });
    if (![400, 403, 404, 409].includes(mutationRes.response.status)) {
      fail(`${path} returned unexpected status (${mutationRes.response.status})`);
    }
  }

  console.log("Platform governance smoke check passed.");
}

main().catch((error) => {
  fail(`unexpected error: ${error?.message || error}`);
});
