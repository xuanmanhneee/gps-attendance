import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

// Đo đăng nhập đồng loạt: mỗi sinh viên một VU, tất cả bấm "Đăng nhập" cùng
// lúc (cả lớp mở app đầu giờ). Dùng tài khoản do `prepare` tạo; chạy prepare
// với LOAD_BCRYPT_COST=10 để chi phí băm khớp production.
//
// LOGIN_FLOOD=N: song song gửi thêm N lần đăng nhập sai bằng username luân
// phiên (né bộ đếm theo username) để xem độ trễ của đăng nhập hợp lệ khi bị
// tấn công, và giới hạn theo IP có kích hoạt không.
const fixture = JSON.parse(open('/data/load-data.json'));
const users = new SharedArray('load users', () => fixture.users);
const apiUrl = (__ENV.API_URL || 'http://load-balancer').replace(/\/$/, '');
const p95Ms = Number(__ENV.P95_MS || 3000);
const flood = Number(__ENV.LOGIN_FLOOD || 0);
const floodRejected = new Counter('flood_rejected_429');
const floodAttempts = new Counter('flood_attempts');

const usernameFor = (index) =>
  `load-student-${String(index).padStart(6, '0')}`;

export const options = {
  scenarios: {
    login: {
      executor: 'per-vu-iterations',
      vus: users.length,
      iterations: 1,
      maxDuration: '120s',
      exec: 'login',
    },
    ...(flood > 0 && {
      flood: {
        executor: 'per-vu-iterations',
        vus: Math.min(flood, 200),
        iterations: Math.ceil(flood / Math.min(flood, 200)),
        maxDuration: '120s',
        exec: 'floodLogin',
      },
    }),
  },
  thresholds: {
    'http_req_duration{endpoint:login}': [`p(95)<${p95Ms}`],
    'http_req_failed{endpoint:login}': ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const post = (username, password, endpoint) =>
  http.post(
    `${apiUrl}/v0/user/auth/login`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint } },
  );

export function login() {
  // idInTest bắt đầu từ 1 và trùng thứ tự `prepare` tạo tài khoản.
  const res = post(usernameFor(exec.scenario.iterationInTest + 1), 'performance-test-only', 'login');
  check(res, {
    'login 200': (r) => r.status === 200,
    'có accessToken': (r) => r.status === 200 && !!r.json('data.accessToken'),
  });
}

export function floodLogin() {
  const res = post(`ghost-${exec.vu.idInTest}-${exec.vu.iterationInScenario}`, 'wrong', 'flood');
  floodAttempts.add(1);
  if (res.status === 429) floodRejected.add(1);
}
