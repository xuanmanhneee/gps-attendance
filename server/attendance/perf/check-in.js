import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const fixture = JSON.parse(open('/data/load-data.json'));
const users = new SharedArray('load users', () => fixture.users);
const timeUnit = __ENV.LOAD_TIME_UNIT || '1m';
const sent = new Counter('check_in_sent');

export const options = {
  scenarios: {
    check_in: {
      executor: 'constant-arrival-rate',
      rate: users.length,
      timeUnit,
      duration: timeUnit,
      preAllocatedVUs: Number(__ENV.LOAD_VUS || 100),
    },
  },
  thresholds: {
    'http_req_duration{endpoint:check-in}': ['p(95)<1000'],
    'http_req_failed{endpoint:check-in}': ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
    check_in_sent: [`count==${users.length}`],
  },
};

export default function () {
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
