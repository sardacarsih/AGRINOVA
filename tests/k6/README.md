# k6 Login Tests

This folder contains HTTP-level load tests for the GraphQL login flows used by the web and mobile apps.

## Covered Flows

- `login-web.js`: tests `webLogin` and optionally validates the cookie-backed session with `currentUser`.
- `login-mobile.js`: tests `mobileLogin` and optionally validates the returned JWT with `me`.

## Requirements

- `k6` installed on the machine running the tests
- the Agrinova GraphQL API reachable at `BASE_URL + GRAPHQL_PATH`
- valid credentials for the web and mobile users under test

## Environment Variables

### Shared

- `BASE_URL` (default: `http://localhost:8080`)
- `GRAPHQL_PATH` (default: `/graphql`)

### Web

- `WEB_USER` (optional; forces all VUs to use one account)
- `WEB_PASS` (required when `WEB_USER` is set; otherwise reused as pool password if provided)
- `WEB_USER_POOL` (optional; comma-separated list, defaults to `superadmin,companyadmin,areamanager,manager,asisten,mandor,satpam`)
- `WEB_POOL_PASS` (default: `demo123`)
- `WEB_DEBUG_USERS` (default: `false`; logs the validated pool, VU-to-user mapping, and per-user failures)
- `WEB_VERIFY_SESSION` (default: `true`)
- `WEB_SLEEP_SECONDS` (default: `1`)

### Mobile

- `MOBILE_USER` (optional; forces all VUs to use one account)
- `MOBILE_PASS` (required when `MOBILE_USER` is set; otherwise reused as pool password if provided)
- `MOBILE_USER_POOL` (optional; comma-separated list, defaults to `areamanager,manager,asisten,mandor,satpam`)
- `MOBILE_POOL_PASS` (default: `demo123`)
- `MOBILE_PLATFORM` (default: `ANDROID`)
- `MOBILE_DEBUG_USERS` (default: `false`; logs the validated pool, VU-to-user mapping, and per-user failures)
- `MOBILE_VERIFY_TOKEN` (default: `true`)
- `MOBILE_DEVICE_ID_PREFIX` (default: `k6-device`)
- `MOBILE_SLEEP_SECONDS` (default: `1`)

## Usage

### Run Web Login Test

```powershell
k6 run .\tests\k6\login-web.js -e BASE_URL=http://localhost:8080
```

Or via npm:

```powershell
$env:BASE_URL='http://localhost:8080'
npm run test:k6:web-login
```

To force a single test account instead of the default pool:

```powershell
k6 run .\tests\k6\login-web.js `
  -e BASE_URL=http://localhost:8080 `
  -e WEB_USER=superadmin `
  -e WEB_PASS=demo123
```

To print the validated pool and which account each VU uses during debugging:

```powershell
k6 run .\tests\k6\login-web.js `
  -e BASE_URL=http://localhost:8080 `
  -e WEB_DEBUG_USERS=true
```

To run the staged login-only capacity sweep (`25,50,75,100,150,200,300,500,700,1000` VUs by default):

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\k6\run-web-login-capacity.ps1
```

Or override the levels:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\k6\run-web-login-capacity.ps1 `
  -Levels "300,500,1000"
```

### Run Mobile Login Test

```powershell
k6 run .\tests\k6\login-mobile.js -e BASE_URL=http://localhost:8080
```

Or via npm:

```powershell
$env:BASE_URL='http://localhost:8080'
npm run test:k6:mobile-login
```

To force a single mobile account instead of the default pool:

```powershell
k6 run .\tests\k6\login-mobile.js `
  -e BASE_URL=http://localhost:8080 `
  -e MOBILE_USER=manager `
  -e MOBILE_PASS=demo123
```

To print the validated mobile pool and which account each VU uses during debugging:

```powershell
k6 run .\tests\k6\login-mobile.js `
  -e BASE_URL=http://localhost:8080 `
  -e MOBILE_DEBUG_USERS=true
```

To run the staged mobile login-only capacity sweep (`25,50,75,100` VUs by default):

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\k6\run-mobile-login-capacity.ps1
```

## Grafana Dashboard

A ready-to-import Grafana dashboard for the web login capacity test is available at:

- `tests/k6/grafana/web-login-capacity-dashboard.json`
- `tests/k6/grafana/mobile-login-capacity-dashboard.json`

This dashboard assumes:

- k6 metrics are sent to a Prometheus-compatible backend using `experimental-prometheus-rw`
- the query backend is configured in Grafana as a Prometheus datasource
- trend stats include at least `p(50)`, `p(95)`, and `p(99)`

Recommended environment before running k6 with Grafana/Prometheus:

```powershell
$env:K6_PROMETHEUS_RW_SERVER_URL='http://localhost:9090/api/v1/write'
$env:K6_PROMETHEUS_RW_TREND_STATS='p(50),p(95),p(99),avg,max'
```

Example run:

```powershell
k6 run -o experimental-prometheus-rw .\tests\k6\login-web.js `
  -e BASE_URL=http://localhost:8080 `
  -e WEB_VERIFY_SESSION=false
```

For the web login flow, the default SLO/threshold targets are:

- availability `>= 99.9%` (tracked from uptime monitoring, not a single k6 run)
- error rate `<= 0.5%` (`web_login_success_rate >= 99.5%`)
- login latency `p95 <= 1s`
- login latency `p99 <= 2s`

The dashboard focuses on:

- login p95, p99, and success rate against the configured thresholds
- HTTP failures and throughput
- VU ramp behavior
- per-user login p95 using the `user` tag emitted by `login-web.js`

The mobile dashboard adds:

- token validation success rate (`mobile_token_success_rate`)
- `me` query latency (`mobile_me_duration`)

### Local Prometheus Setup (No Docker)

If you are using a local Prometheus instance on the same machine:

1. Start Prometheus with remote write receiver enabled:

```powershell
prometheus.exe --config.file=prometheus.yml --web.enable-remote-write-receiver
```

2. Point k6 at the local Prometheus write endpoint:

```powershell
$env:K6_PROMETHEUS_RW_SERVER_URL='http://localhost:9090/api/v1/write'
$env:K6_PROMETHEUS_RW_TREND_STATS='p(50),p(95),p(99),avg,max'
```

3. Run the web or mobile test with Prometheus output:

```powershell
k6 run -o experimental-prometheus-rw .\tests\k6\login-web.js `
  -e BASE_URL=http://localhost:8080 `
  -e WEB_VERIFY_SESSION=false
```

```powershell
k6 run -o experimental-prometheus-rw .\tests\k6\login-mobile.js `
  -e BASE_URL=http://localhost:8080 `
  -e MOBILE_VERIFY_TOKEN=false
```

4. In Grafana, configure a Prometheus datasource pointing to:

```text
http://localhost:9090
```

5. Import the dashboard JSON and select that datasource.

Notes for local Prometheus:

- The `--web.enable-remote-write-receiver` flag is required. Without it, k6 remote write will fail.
- These dashboards read directly from Prometheus query API; no extra scrape job is needed for the k6 remote write path.
- If Prometheus is not running on port `9090`, adjust both the k6 write URL and the Grafana datasource URL.

Important:

- Changing `AGRINOVA_AUTH_ARGON2_*` env vars only affects new hashes. Existing users must be rehashed before the login dashboard reflects the lighter profile in end-to-end tests.
- If your remote-write receiver is not Prometheus itself, point Grafana at the compatible query endpoint for that backend instead.

## Notes

- `config.example.json` is a reference template only. The scripts read from environment variables, not directly from the JSON file.
- `login-web.js` now uses a conservative default ramping profile sized for the default 7-user pool: `0 -> 7 VUs -> 0`.
- `login-mobile.js` keeps the conservative default ramping profile: `0 -> 5 VUs -> 0`.
- The web login script validates the configured pool in `setup()` and skips invalid accounts before the load phase starts.
- The mobile login script validates the configured pool in `setup()` and skips invalid accounts before the load phase starts.
- `web_login_http_failures` now counts HTTP status failures and transport errors such as request timeouts.
- `mobile_login_http_failures` counts HTTP status failures and transport errors such as request timeouts.
- For mobile, each iteration generates a unique `deviceId` and `deviceFingerprint` per user to avoid device-binding collisions during load.
- See `RESULTS.md` in this folder for the current web login benchmark baseline.
