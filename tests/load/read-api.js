import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const role = (__ENV.ROLE || 'participant').toLowerCase();
const token = __ENV.TOKEN;
const sessionId = __ENV.SESSION_ID;
const maxVus = Math.max(1, Number(__ENV.MAX_VUS || 50));
const rampVus = Math.max(1, Math.floor(maxVus / 2));
const p95Ms = Number(__ENV.P95_MS || 1000);
const errorRate = Number(__ENV.ERROR_RATE || 0.01);
const pauseSeconds = Math.max(0, Number(__ENV.PAUSE_SECONDS ?? 0.5));

export const options = {
  stages: [
    { duration: '30s', target: rampVus },
    { duration: '1m', target: maxVus },
    { duration: '1m', target: maxVus },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: [`rate<${errorRate}`],
    http_req_duration: [`p(95)<${p95Ms}`],
  },
};

const studentPaths = [
  '/v0/attendance-sessions/me',
  '/v0/attendance/records/mine',
  '/v0/attendance/records/summary',
];

const staffPaths = [
  '/v0/attendance-sessions',
  '/v0/attendance-sessions/analytics',
];

function getPaths() {
  if (role === 'participant') return studentPaths;
  if (role === 'organizer' || role === 'admin') {
    return sessionId
      ? [...staffPaths, `/v0/attendance-sessions/${sessionId}/detail`]
      : staffPaths;
  }
  throw new Error('ROLE must be participant, organizer, or admin');
}

export default function () {
  if (!token) throw new Error('Set TOKEN to a valid access token');

  const paths = getPaths();
  const path = paths[Math.floor(Math.random() * paths.length)];
  const response = http.get(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    tags: { endpoint: path },
  });

  check(response, {
    [`${path} returns HTTP 200`]: (result) => result.status === 200,
  });
  sleep(pauseSeconds);
}