# Local performance stack

This stack is isolated from `docker-compose.yml`: it has its own Compose
project, PostgreSQL/Redis volumes, and API image. PostgreSQL and Redis do not
publish host ports; an Nginx load balancer is bound to `127.0.0.1:3100`.

Run from the repository root:

```powershell
docker compose -f docker-compose.perf.yml up --build -d --scale backend=3 load-balancer
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

The default test starts one check-in per user over one minute. For a burst
of 1,000 check-ins over ten seconds, set `LOAD_TIME_UNIT=10s` and
`LOAD_VUS=1000` before running `load`. The default p95 acceptance threshold is
50 ms (`PERF_P95_MS` can be set for a different agreed target). A failed
`dropped_iterations` threshold means k6 did not send the intended load.

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

Resource defaults are 2 CPU/2 GB per API instance, 2 CPU/2 GB for PostgreSQL, and
1 CPU/512 MB for Redis. Override with `PERF_API_CPUS`, `PERF_API_MEMORY`,
`PERF_DB_CPUS`, `PERF_DB_MEMORY`, `PERF_REDIS_CPUS`, and `PERF_REDIS_MEMORY`.
Each API instance defaults to a 15-connection PostgreSQL pool; override with
`PERF_DB_POOL_MAX` while keeping the sum across API replicas and other clients
below PostgreSQL's configured connection limit.
Keep enough host capacity for k6 and Docker Desktop. The test fixture count
can be changed with `LOAD_USERS`; session length with `LOAD_SESSION_MINUTES`.
The isolated performance API enables the test-only rate-limit bypass and
supplies mock integrity evidence; never enable these settings in production.

Stop the stack without deleting its test data:

```powershell
docker compose -f docker-compose.perf.yml down
```

The generated tokens live only in the `perf_data` Docker volume. Treat that
volume as test credentials and never use this stack against a public API.
