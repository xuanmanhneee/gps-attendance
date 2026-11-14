# Local performance stack

This stack is isolated from `docker-compose.yml`: it has its own Compose
project, PostgreSQL/Redis volumes, and API image. PostgreSQL and Redis do not
publish host ports. Requests go through an nginx load balancer bound to
`127.0.0.1:3100` (`perf/nginx.conf`), which keeps upstream connections alive
and spreads them over every `api` instance. Migrations run once in the
`migrate` service before any API instance starts.

Run from the repository root:

```powershell
docker compose -f docker-compose.perf.yml up --build -d load-balancer
docker compose -f docker-compose.perf.yml run --rm prepare
docker compose -f docker-compose.perf.yml run --rm load
docker compose -f docker-compose.perf.yml run --rm verify
docker compose -f docker-compose.perf.yml stats
```

`prepare` reuses the prefixed `LOAD` users/accounts, creates a new open
session, writes its 1,000 absent records to Redis, schedules the normal flush
job, and saves test tokens in a private Docker volume. It bypasses session
creation and roster initialization so the k6 result measures the check-in hot
path. Run separate functional tests for those two setup steps.

The default test starts one check-in per user over one minute. To send the
same 1,000 requests over ten seconds, set `LOAD_TIME_UNIT=10s` before running
`load`. If the machine cannot run enough k6 virtual users, increase
`LOAD_VUS`. A failed `dropped_iterations` threshold means k6 did not send the
intended load.

To send every check-in at the same moment (one virtual user per student,
like a whole class pressing the button when the session opens), set
`LOAD_MODE=burst`. The p95 threshold defaults to 1,000 ms; override it with
`PERF_P95_MS`. k6 also reports `proxy_first_byte_ms`, `upstream_connect_ms`
and `upstream_header_ms` from the load balancer headers.

```powershell
$env:LOAD_MODE = 'burst'
docker compose -f docker-compose.perf.yml run --rm load
Remove-Item Env:LOAD_MODE
```

The default session closes ten minutes after `prepare`. Once it closes and
the scheduler has run (it polls every ten seconds), verify PostgreSQL:

```powershell
$env:VERIFY_PHASE = 'after-flush'
docker compose -f docker-compose.perf.yml run --rm verify
Remove-Item Env:VERIFY_PHASE
```

`before-flush` verification expects all students present in Redis and no
PostgreSQL records. `after-flush` expects all students present in PostgreSQL
and an empty Redis buffer. Each run needs a fresh `prepare` invocation.

To check two concurrent users sharing a device and two concurrent requests
from one user, prepare a separate fixture with at least three users, then run:

```powershell
docker compose -f docker-compose.perf.yml run --rm -e LOAD_USERS=3 prepare
docker compose -f docker-compose.perf.yml run --rm --entrypoint k6 load run /scripts/check-in-race.js
```

To measure session creation including roster initialization (a session that
opens immediately, so the `POST` writes the whole roster to Redis), run after
`prepare`. It prints per-run latency and roster size, then cancels each
session. Set `ROSTER_RUNS` (default 5) for more runs.

```powershell
docker compose -f docker-compose.perf.yml run --rm roster
```

To measure read APIs, run `read` after `prepare`. It sends
`GET /v0/attendance-sessions/me` with a different student token each request
(`READ_PARTICIPANT_RATE`, default 100 req/s) and rotates the organizer reads
(created-by-me, session detail, session reviews, review history;
`READ_ORGANIZER_RATE`, default 10 req/s) for `READ_DURATION` (default `1m`).

```powershell
docker compose -f docker-compose.perf.yml run --rm read
```

`GET /me` cost depends on how many sessions are open, not on the Redis key
count. To reproduce a busy hour, seed extra open buffers and device keys as
described in `RESULTS-2026-11-15.md`.

After scaling `PERF_API_REPLICAS` down, restart the load balancer
(`docker compose -f docker-compose.perf.yml restart load-balancer`); nginx
keeps the removed instance's address and returns 502 for part of the
requests until then. Rebuilding the API image leaves old layers behind; run
`docker builder prune -f` afterwards so Docker Desktop's disk does not fill
up.

To run several API instances behind the load balancer, set
`PERF_API_REPLICAS` (default 1). Each instance opens up to `PERF_DB_POOL_MAX`
PostgreSQL connections (default 15); keep `replicas × pool` below the
PostgreSQL `max_connections` limit (100 by default). Responses carry
`X-Proxy-First-Byte-Time`, `X-Upstream-Connect-Time` and
`X-Upstream-Header-Time` so proxy overhead can be separated from API time.

```powershell
$env:PERF_API_REPLICAS = '2'
docker compose -f docker-compose.perf.yml up --build -d load-balancer
```

Resource defaults are 2 CPU/2 GB for API, 2 CPU/2 GB for PostgreSQL, and
1 CPU/512 MB for Redis; limits apply to each API instance. Override with `PERF_API_CPUS`, `PERF_API_MEMORY`,
`PERF_DB_CPUS`, `PERF_DB_MEMORY`, `PERF_REDIS_CPUS`, and `PERF_REDIS_MEMORY`.
Keep enough host capacity for k6 and Docker Desktop. The test fixture count
can be changed with `LOAD_USERS`; session length with `LOAD_SESSION_MINUTES`.

Stop the stack without deleting its test data:

```powershell
docker compose -f docker-compose.perf.yml down
```

The generated tokens live only in the `perf_data` Docker volume. Treat that
volume as test credentials and never use this stack against a public API.
