import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const fixture = JSON.parse(open('/data/load-data.json'));
const users = new SharedArray('load users', () => fixture.users);
const timeUnit = __ENV.LOAD_TIME_UNIT || '1m';
// rate: rải đều mọi check-in trong LOAD_TIME_UNIT.
// burst: mỗi sinh viên một VU, tất cả gửi cùng lúc (giống cả lớp bấm điểm
// danh ngay khi phiên mở).
const mode = __ENV.LOAD_MODE || 'rate';
const p95Ms = Number(__ENV.P95_MS || 1000);
const sent = new Counter('check_in_sent');
const proxyFirstByte = new Trend('proxy_first_byte_ms', true);
const upstreamConnect = new Trend('upstream_connect_ms', true);
const upstreamHeader = new Trend('upstream_header_ms', true);

const scenarios = {
  rate: {
    executor: 'constant-arrival-rate',
    rate: users.length,
    timeUnit,
    duration: timeUnit,
    preAllocatedVUs: Number(__ENV.LOAD_VUS || 100),
  },
  burst: {
    executor: 'per-vu-iterations',
    vus: users.length,
    iterations: 1,
    maxDuration: '60s',
  },
};
if (!scenarios[mode]) {
  throw new Error(`LOAD_MODE must be one of: ${Object.keys(scenarios)}`);
}

export const options = {
  scenarios: { check_in: scenarios[mode] },
  thresholds: {
    'http_req_duration{endpoint:check-in}': [`p(95)<${p95Ms}`],
    'http_req_failed{endpoint:check-in}': ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
    check_in_sent: [`count==${users.length}`],
  },
};

// Header do nginx (perf/nginx.conf) gắn, đơn vị giây.
function recordProxyTimings(response) {
  const seconds = (name) => Number(response.headers[name]);
  const timings = [
    [proxyFirstByte, seconds('X-Proxy-First-Byte-Time')],
    [upstreamConnect, seconds('X-Upstream-Connect-Time')],
    [upstreamHeader, seconds('X-Upstream-Header-Time')],
  ];
  for (const [trend, value] of timings) {
    if (Number.isFinite(value)) trend.add(value * 1000);
  }
}

export default function () {
  // Chờ mọi VU khởi tạo xong để các request burst thực sự đến cùng lúc.
  if (mode === 'burst') sleep(2);
  const index = exec.scenario.iterationInTest;
  // Arrival-rate executor có thể bắt đầu thêm một iteration đúng ranh giới
  // duration; chỉ gửi đúng một request cho mỗi sinh viên trong fixture.
  if (index >= users.length) return;
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
      integrity: { integrityToken: null },
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
  recordProxyTimings(response);

  check(response, {
    'check-in accepted': (r) => {
      if (r.status !== 201) return false;
      try {
        const body = r.json();
        return body.success === true && body.data.status === 'VALID';
      } catch (_) {
        return false;
      }
    },
  });
}
