# Daftar v1 — Load Tests

Requires [k6](https://k6.io/docs/get-started/installation/) installed on the machine.

## Setup

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Install k6 (Windows via Choco)
choco install k6
```

## Running Tests

```bash
# Set env vars first
export BASE_URL=http://localhost:7000
export AUTH_EMAIL=owner@example.com
export AUTH_PASSWORD=your-password

# Run individual tests
k6 run load-tests/get-customers.js
k6 run load-tests/get-dashboard.js
k6 run load-tests/post-invoices.js

# Run full suite
k6 run load-tests/suite.js

# Run with custom VUs and duration
k6 run --vus 100 --duration 60s load-tests/get-customers.js
```

## Target Thresholds

| Endpoint          | VUs | Duration | p95 target | Error rate |
|-------------------|-----|----------|------------|------------|
| GET /dashboard    | 100 | 60s      | < 800ms    | < 1%       |
| GET /customers    | 100 | 60s      | < 600ms    | < 1%       |
| POST /invoices    | 50  | 60s      | < 1200ms   | < 2%       |

## Reports

k6 outputs to stdout. For HTML reports:

```bash
k6 run --out json=results.json load-tests/suite.js
k6 run --out csv=results.csv load-tests/get-dashboard.js
```
