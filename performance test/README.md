# PG Stay — K6 Performance Tests

## Prerequisites

1. **Install K6** (Grafana K6):
   ```powershell
   # Windows (winget)
   winget install k6 --source winget

   # Or via Chocolatey
   choco install k6
   ```

2. **Start the backend server** on `http://localhost:5000`

3. **Update credentials** in `config.js` (or pass via environment variables)

## Test Files

| File | Description |
|------|-------------|
| `config.js` | Shared configuration — base URL, credentials, thresholds, load profiles |
| `helpers.js` | Reusable helpers — login, auth headers, response checks |
| `main-test.js` | **Primary test** — read-heavy, covers all API groups (auth, admin, tenant, guest, super-admin) |
| `crud-test.js` | **Write test** — creates/updates/deletes buildings & rooms under load |

## Running Tests

### Quick Smoke Test (1 VU, 30s)
```powershell
k6 run "performance test/main-test.js"
```

### Load Test (10–20 VUs, ~9 min)
```powershell
k6 run --env PROFILE=load "performance test/main-test.js"
```

### Stress Test (up to 100 VUs, ~11 min)
```powershell
k6 run --env PROFILE=stress "performance test/main-test.js"
```

### Spike Test (sudden 100 VU burst)
```powershell
k6 run --env PROFILE=spike "performance test/main-test.js"
```

### Soak Test (20 VUs for 30 min)
```powershell
k6 run --env PROFILE=soak "performance test/main-test.js"
```

### CRUD Write Test
```powershell
k6 run "performance test/crud-test.js"
k6 run --env PROFILE=load "performance test/crud-test.js"
```

## Overriding Credentials

```powershell
k6 run `
  --env ADMIN_EMAIL=admin@myorg.com `
  --env ADMIN_PASSWORD=mypassword `
  --env TENANT_EMAIL=tenant@myorg.com `
  --env TENANT_PASSWORD=tenantpass `
  --env ORG_SLUG=my-org-slug `
  "performance test/main-test.js"
```

## Load Profiles

| Profile | VUs | Duration | Use Case |
|---------|-----|----------|----------|
| `smoke` | 1 | 30s | Verify tests work |
| `load` | 10→20 | ~9 min | Normal expected load |
| `stress` | 10→100 | ~11 min | Find breaking point |
| `spike` | 5→100→5 | ~3 min | Sudden traffic burst |
| `soak` | 20 | ~34 min | Memory leaks, long-term stability |

## Custom Metrics

| Metric | Description |
|--------|-------------|
| `login_duration` | Time to complete login |
| `admin_api_duration` | Admin endpoint response times |
| `tenant_api_duration` | Tenant endpoint response times |
| `public_api_duration` | Public/guest endpoint response times |
| `auth_success_rate` | Login success rate |
| `api_errors` | Total API error count |
| `crud_operation_duration` | CRUD operation times (write test) |

## Thresholds

- **p(95) < 500ms** — 95th percentile response time under 500ms
- **p(99) < 1000ms** — 99th percentile under 1 second
- **Error rate < 1%** — Less than 1% of requests fail
- **Throughput > 10 RPS** — At least 10 requests per second

## Grafana Dashboard (Optional)

To visualize results in Grafana:

1. Run K6 with InfluxDB output:
   ```powershell
   k6 run --out influxdb=http://localhost:8086/k6 "performance test/main-test.js"
   ```

2. Or use Grafana Cloud K6:
   ```powershell
   k6 cloud "performance test/main-test.js"
   ```

3. Or export to JSON for later analysis:
   ```powershell
   k6 run --out json=results.json "performance test/main-test.js"
   ```
