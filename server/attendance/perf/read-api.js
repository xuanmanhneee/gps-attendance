import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

// Đo các API đọc của màn hình sinh viên và giảng viên trên stack perf.
// Dùng fixture do `prepare` tạo: mỗi sinh viên một token riêng, cùng token
// của giảng viên tạo phiên. Chuyển thể từ tests/load/read-api.js (nhánh
// Phước), đổi sang token theo từng người và endpoint đang có trên main.
const fixture = JSON.parse(open('/data/load-data.json'));
const users = new SharedArray('load users', () => fixture.users);
if (!fixture.organizer) {
  throw new Error('Fixture thiếu organizer token, chạy lại `prepare`');
}

const apiUrl = (__ENV.API_URL || 'http://load-balancer').replace(/\/$/, '');
const duration = __ENV.READ_DURATION || '1m';
// Số request/giây cho mỗi nhóm.
const participantRate = Number(__ENV.READ_PARTICIPANT_RATE || 100);
const organizerRate = Number(__ENV.READ_ORGANIZER_RATE || 10);
const p95Ms = Number(__ENV.P95_MS || 1000);
const sessionId = fixture.sessionId;

const organizerPaths = [
  ['created-by-me', '/v0/attendance-sessions/created-by-me'],
  ['session-detail', `/v0/attendance-sessions/${sessionId}`],
  ['session-reviews', `/v0/attendance/sessions/${sessionId}/reviews`],
  ['reviews-history', '/v0/attendance/reviews/history'],
];

const arrival = (rate, exec) => ({
  executor: 'constant-arrival-rate',
  rate,
  timeUnit: '1s',
  duration,
  preAllocatedVUs: Math.max(10, rate),
  maxVUs: Math.max(50, rate * 4),
  exec,
});

export const options = {
  scenarios: {
    participant: arrival(participantRate, 'participant'),
    organizer: arrival(organizerRate, 'organizer'),
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:my-sessions}': [`p(95)<${p95Ms}`],
    ...Object.fromEntries(
      organizerPaths.map(([endpoint]) => [
        `http_req_duration{endpoint:${endpoint}}`,
        [`p(95)<${p95Ms}`],
      ]),
    ),
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
  },
};

function get(path, token, endpoint) {
  const response = http.get(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    tags: { endpoint },
  });
  check(response, { [`${endpoint} 200`]: (r) => r.status === 200 });
  return response;
}

// Màn hình chính của sinh viên: danh sách phiên của mình.
export function participant() {
  const user = users[exec.scenario.iterationInTest % users.length];
  get('/v0/attendance-sessions/me', user.token, 'my-sessions');
}

export function organizer() {
  const [endpoint, path] =
    organizerPaths[exec.scenario.iterationInTest % organizerPaths.length];
  get(path, fixture.organizer.token, endpoint);
}
