import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const fixture = JSON.parse(open('/data/load-data.json'));
const users = new SharedArray('load users', () => fixture.users);
const virtualUsers = Number(__ENV.LOAD_VUS || 1200);
const p95Ms = Number(__ENV.P95_MS || 50);
const sent = new Counter('check_in_sent');
const serverPreHandler = new Trend('server_pre_handler_ms');
const serverHandler = new Trend('server_handler_ms');
const serverRequest = new Trend('server_request_ms');
const clientBlocked = new Trend('client_blocked_ms');
const clientConnecting = new Trend('client_connecting_ms');
const clientSending = new Trend('client_sending_ms');
const clientWaiting = new Trend('client_waiting_ms');
const clientReceiving = new Trend('client_receiving_ms');
const proxyFirstByte = new Trend('proxy_first_byte_ms');
const upstreamConnect = new Trend('upstream_connect_ms');
const upstreamHeader = new Trend('upstream_header_ms');

if (users.length !== virtualUsers) {
  throw new Error(
    `Expected ${virtualUsers} fixture users, found ${users.length}`,
  );
}

export const options = {
  scenarios: {
    concurrent_check_in: {
      executor: 'per-vu-iterations',
      vus: virtualUsers,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:check-in}': [`p(95)<${p95Ms}`],
    'http_req_failed{endpoint:check-in}': ['rate==0'],
    checks: ['rate==1'],
    check_in_sent: [`count==${users.length}`],
  },
};

export default function () {
  sleep(2);
  const index = exec.scenario.iterationInTest;
  const user = users[index];
  const response = http.post(
    `${__ENV.API_URL}/v0/attendance/check-in`,
    JSON.stringify({
      sessionId: fixture.sessionId,
      location: {
        latitude: fixture.latitude,
        longitude: fixture.longitude,
        accuracy: 10,
        timestamp: Date.now(),
        isMockLocation: false,
      },
      device: {
        deviceId: user.deviceId,
        platform: 'android',
        model: 'Performance test device',
      },
      integrity: {
        integrityToken: 'gps-attendance-loadtest-attestation',
      },
    }),
    {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'check-in' },
    },
  );
  sent.add(1);
  clientBlocked.add(response.timings.blocked);
  clientConnecting.add(response.timings.connecting);
  clientSending.add(response.timings.sending);
  clientWaiting.add(response.timings.waiting);
  clientReceiving.add(response.timings.receiving);
  const timingHeader = (name) =>
    response.headers[name] || response.headers[name.toLowerCase()];
  const upstreamTimingMs = (name) => Number(timingHeader(name)) * 1000;
  const timingHeaders = {
    preHandler: Number(timingHeader('X-Server-Pre-Handler-Duration-Ms')),
    handler: Number(timingHeader('X-Server-Handler-Duration-Ms')),
    request: Number(timingHeader('X-Server-Request-Duration-Ms')),
  };
  const proxyTimings = {
    firstByte: upstreamTimingMs('X-Proxy-First-Byte-Time'),
    connect: upstreamTimingMs('X-Upstream-Connect-Time'),
    header: upstreamTimingMs('X-Upstream-Header-Time'),
  };
  if (Object.values(timingHeaders).every(Number.isFinite)) {
    serverPreHandler.add(timingHeaders.preHandler);
    serverHandler.add(timingHeaders.handler);
    serverRequest.add(timingHeaders.request);
  }
  if (Object.values(proxyTimings).every(Number.isFinite)) {
    proxyFirstByte.add(proxyTimings.firstByte);
    upstreamConnect.add(proxyTimings.connect);
    upstreamHeader.add(proxyTimings.header);
  }

  check(response, {
    'check-in accepted': (r) => {
      if (r.status !== 200) return false;
      try {
        const body = r.json();
        return body.success === true && body.data.status === 'VALID';
      } catch (_) {
        return false;
      }
    },
    'server timing captured': () =>
      Object.values(timingHeaders).every(Number.isFinite),
    'proxy timing captured': () =>
      Object.values(proxyTimings).every(Number.isFinite),
  });
}
