# Load Tests

These k6 scenarios measure API behavior on an explicitly selected local or staging environment. Do not run write scenarios against production.

## Prerequisites

- Install k6 and start the API against a disposable or staging database.
- Use valid access tokens for the selected role.
- Keep the API, database, Redis, and load generator close to the intended deployment topology.

## Read-only API ramp test

The scenario ramps to `MAX_VUS` virtual users and repeatedly calls a role-specific mix of endpoints. `TOKEN` is required. `ROLE` accepts `participant`, `organizer`, or `admin`; `SESSION_ID` adds the session detail endpoint to staff traffic.

PowerShell example:

```powershell
$env:BASE_URL = 'http://localhost:3000'
$env:TOKEN = '<access-token>'
$env:ROLE = 'participant'
$env:MAX_VUS = '50'
$env:P95_MS = '1000'
$env:ERROR_RATE = '0.01'
k6 run tests/load/read-api.js
```

Optional settings: `PAUSE_SECONDS` (default `0.5`), `P95_MS` (default `1000`), and `ERROR_RATE` (default `0.01`). Run separate tests for student and staff roles so the result identifies which API mix is under load.

## Check-in ramp and spike test

`checkin-burst.js` ramps from `RAMP_VUS` to `MAX_VUS`, holds the spike, then cools down. Each VU sends exactly one check-in; later iterations sleep without sending more requests. Supply at least `MAX_VUS` fixtures through `CHECKIN_FIXTURES`. Every fixture needs a unique student token and device ID, plus a numeric session ID assigned to that student. The target session must be open and disposable. The runner refreshes each location timestamp at send time.

Fixture shape:

```json
[
  {
    "token": "student-access-token",
    "payload": {
      "sessionId": 123,
      "location": {
        "latitude": 11.9404,
        "longitude": 108.4583,
        "accuracy": 10,
        "timestamp": 1790000000000,
        "isMockLocation": false
      },
      "device": {
        "deviceId": "load-test-device-001",
        "platform": "android",
        "model": "load-test"
      },
      "integrity": { "integrityToken": null }
    }
  }
]
```

PowerShell example for a 50-user ramp/spike:

```powershell
$env:BASE_URL = 'http://localhost:3000'
$env:CHECKIN_FIXTURES = 'checkin-fixtures.local.json'
$env:MAX_VUS = '50'
$env:RAMP_VUS = '10'
$env:RAMP_DURATION = '15s'
$env:SPIKE_DURATION = '10s'
$env:HOLD_DURATION = '30s'
$env:COOLDOWN_DURATION = '10s'
k6 run tests/load/checkin-burst.js --summary-export=result-spike-50vu.json
```

Optional thresholds: `P95_MS` (default `1000`) and `TECHNICAL_ERROR_RATE` (default `0.01`). The script reports `checkin_rate_limited`, `checkin_business_rejected`, `checkin_accepted`, and a technical error rate separately. k6's built-in `http_req_failed` includes HTTP 4xx such as 429, so do not interpret it as infrastructure-only errors.

Keep real tokens and local fixture files out of version control. Do not delete attendance rows or attempts to reset tests. The schema stores records, attempts, audit logs, and review evidence; use a disposable test database and create a fresh test session for each run.

`checkin-fixtures.example.json` is a placeholder-only template, not a runnable credential. Fixture paths passed to k6 are relative to the script directory. To check k6 module loading without sending requests, run `k6 inspect -e CHECKIN_FIXTURES=checkin-fixtures.example.json -e MAX_VUS=1 tests/load/checkin-burst.js`.

The endpoint currently has a 3-request/60-second throttler; the additional device guard allows 60 requests/IP/minute and 30 requests/device/minute. VUs from one load generator share an IP bucket, so a 50-VU test from one machine will primarily measure rate limiting. To measure backend capacity, run only against isolated staging with an explicitly configured test policy or a legitimate distributed load-generator setup. Do not spoof forwarding headers or disable production limits.

## Interpreting results

Record VUs, request rate, p95/p99 latency, failed checks, HTTP 429 responses, API CPU/memory, database CPU/connections, and Redis health. Increase `MAX_VUS` in controlled steps and stop when the agreed latency/error objectives fail or infrastructure reaches its safe operating limit. The configured thresholds are starter targets, not measured capacity claims.