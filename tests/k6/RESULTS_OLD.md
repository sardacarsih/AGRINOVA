# k6 Web Login Benchmark Results

Date of run: February 28, 2026
Target: local API at `http://localhost:8080`
Scenario: `tests/k6/login-web.js`
Mode: login-only (`WEB_VERIFY_SESSION=false`) unless noted otherwise

## Test profile

- Ramp up: `30s`
- Hold: `1m`
- Ramp down: `15s`
- Credential pool: `superadmin, companyadmin, areamanager, manager, asisten, mandor, satpam`

## Capacity sweep: 25 to 200 concurrent users

This sweep is the best reference for practical capacity planning because it stays below the full overload point.

| Concurrent users | Success rate | p95 login | Avg login | Throughput (`http_reqs/s`) | HTTP fail |
| --- | ---: | ---: | ---: | ---: | ---: |
| 25 | 100.00% | 548.92ms | 313.05ms | 15.02/s | 0.00% |
| 50 | 100.00% | 1.16s | 595.04ms | 24.79/s | 0.00% |
| 75 | 100.00% | 1.79s | 948.33ms | 30.25/s | 0.00% |
| 100 | 100.00% | 2.58s | 1.32s | 33.79/s | 0.00% |
| 150 | 100.00% | 5.99s | 2.28s | 36.11/s | 0.00% |
| 200 | 100.00% | 8.95s | 3.33s | 36.58/s | 0.00% |

## Stress runs: 300, 500, 1000 concurrent users

These runs show saturation and overload behavior.

| Concurrent users | Success rate | p95 login | Avg login | Throughput (`http_reqs/s`) | HTTP fail |
| --- | ---: | ---: | ---: | ---: | ---: |
| 300 | 100.00% | 10.6s | 5.9s | 34.49/s | 0.00% |
| 500 | 100.00% | 20.67s | 11.83s | 32.00/s | 0.00% |
| 1000 | 88.48% | 60s | 34.29s | 23.62/s | 11.48% |

Notes for the 1000-user run:

- The login endpoint started timing out.
- `http_req_failed` rose to `11.48%`.
- Throughput dropped instead of increasing, which indicates queueing and saturation.

## Practical interpretation

- Safe for `p95 < 1s`: about `25` concurrent users
- Usable for `p95 < 2s`: about `75` concurrent users
- Usable for `p95 < 3s`: about `100` concurrent users
- Throughput starts flattening around `36 req/s`
- Beyond `200` concurrent users, latency keeps rising but throughput barely improves
- At `1000` concurrent users, the system is overloaded

## Recommended use

- Use `25` concurrent users as the current safe login capacity if your SLA is `p95 < 1s`
- Use `75` to `100` concurrent users only if multi-second login latency is acceptable
- Treat `300+` concurrent users as stress-test territory, not normal operating capacity

## Commands used

Default login-only benchmark:

```powershell
k6 run --quiet -e BASE_URL=http://localhost:8080 -e WEB_VERIFY_SESSION=false .\tests\k6\login-web.js
```

Capacity sweep helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\k6\run-web-login-capacity.ps1
```

High-concurrency stress example:

```powershell
k6 run --quiet --stage 30s:300 --stage 1m:300 --stage 15s:0 `
  -e BASE_URL=http://localhost:8080 `
  -e WEB_VERIFY_SESSION=false `
  .\tests\k6\login-web.js
```

## Follow-up work

- Profile CPU usage during login to verify password-hash cost under load
- Check database connection pool saturation during `75+` concurrent logins
- Inspect auth/session queries for avoidable round trips or indexing issues
- Re-run the benchmark after backend optimizations and compare against this baseline

## Mobile login benchmark baseline

Date of run: February 28, 2026
Target: local API at `http://localhost:8080`
Scenario: `tests/k6/login-mobile.js`

### Default profile with token validation

Mode: `MOBILE_VERIFY_TOKEN=true`

- `mobile_login_success_rate`: `100.00%`
- `mobile_token_success_rate`: `100.00%`
- `mobile_login_duration` p95: `122.28ms`
- `mobile_me_duration` p95: `5.11ms`
- Validated pool: `areamanager, manager, asisten, mandor, satpam`

### Capacity sweep: 25 to 100 concurrent users

Mode: login-only (`MOBILE_VERIFY_TOKEN=false`)

| Concurrent users | Success rate | p95 login | Avg login | Throughput (`http_reqs/s`) | HTTP fail |
| --- | ---: | ---: | ---: | ---: | ---: |
| 25 | 100.00% | 549.43ms | 245.16ms | 15.91/s | 0.00% |
| 50 | 100.00% | 1.21s | 694.02ms | 23.33/s | 0.00% |
| 75 | 100.00% | 1.87s | 1.08s | 28.30/s | 0.00% |
| 100 | 100.00% | 2.60s | 1.52s | 31.31/s | 0.00% |

### Practical interpretation for mobile

- Safe for `p95 < 1s`: about `25` concurrent users
- Usable for `p95 < 2s`: about `75` concurrent users
- Usable for `p95 < 3s`: about `100` concurrent users
- Throughput starts flattening around `31 req/s`

### Mobile commands used

Default mobile benchmark:

```powershell
k6 run --quiet -e BASE_URL=http://localhost:8080 .\tests\k6\login-mobile.js
```

Mobile capacity sweep helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\k6\run-mobile-login-capacity.ps1
```
