import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const fixturesPath = __ENV.CHECKIN_FIXTURES;
if (!fixturesPath) {
  throw new Error('Set CHECKIN_FIXTURES to a local JSON fixture file');
}

const maxVus = Number(__ENV.MAX_VUS || 50);
if (!Number.isInteger(maxVus) || maxVus < 1) {
  throw new Error('MAX_VUS must be a positive integer');
}

const fixtures = new SharedArray('check-in fixtures', () =>
  JSON.parse(open(fixturesPath)),
);
if (fixtures.length < maxVus) {
  throw new Error(`Need at least ${maxVus} fixtures for MAX_VUS=${maxVus}`);
}

for (const fixture of fixtures) {
  if (
    !fixture?.token ||
    !fixture?.payload ||
    !Number.isInteger(fixture.payload.sessionId) ||
    !fixture.payload.location ||
    !fixture.payload.device?.deviceId
  ) {
    throw new Error(
      'Each fixture needs token, numeric sessionId, location, and device.deviceId',
    );
  }
}

const rampVus = Math.min(Number(__ENV.RAMP_VUS || 10), maxVus);
const rampDuration = __ENV.RAMP_DURATION || '15s';
const spikeDuration = __ENV.SPIKE_DURATION || '10s';
const holdDuration = __ENV.HOLD_DURATION || '30s';
const cooldownDuration = __ENV.COOLDOWN_DURATION || '10s';
const p95Ms = Number(__ENV.P95_MS || 1000);
const technicalErrorRate = Number(__ENV.TECHNICAL_ERROR_RATE || 0.01);

const technicalErrors = new Rate('checkin_technical_error_rate');
const rateLimited = new Counter('checkin_rate_limited');
const businessRejected = new Counter('checkin_business_rejected');
const accepted = new Counter('checkin_accepted');
const checkinLatency = new Trend('checkin_latency', true);

export const options = {
  stages: [
    { duration: rampDuration, target: rampVus },
    { duration: spikeDuration, target: maxVus },
    { duration: holdDuration, target: maxVus },
    { duration: cooldownDuration, target: 0 },
  ],
  thresholds: {
    checkin_technical_error_rate: [`rate<${technicalErrorRate}`],
    checkin_latency: [`p(95)<${p95Ms}`],
    checkin_accepted: [`count>=${maxVus}`],
    checkin_rate_limited: ['count<1'],
    checkin_business_rejected: ['count<1'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  if (__ITER > 0) {
    sleep(1);
    return;
  }

  const fixture = fixtures[__VU - 1];
  if (!fixture?.token || !fixture?.payload) {
    fail(`Fixture ${__VU} must contain token and payload`);
  }

  const payload = {
    ...fixture.payload,
    location: {
      ...fixture.payload.location,
      timestamp: Date.now(),
    },
  };

  const response = http.post(
    `${baseUrl}/v0/attendance/check-in`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${fixture.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      tags: { endpoint: '/v0/attendance/check-in' },
    },
  );

  let body;
  try {
    body = response.json();
  } catch {
    body = null;
  }

  const isTechnicalError = response.status === 0 || response.status >= 500;
  const isAccepted =
    response.status === 200 &&
    (body?.data?.status === 'VALID' || body?.data?.status === 'REVIEW');

  technicalErrors.add(isTechnicalError);
  checkinLatency.add(response.timings.duration);
  if (response.status === 429) rateLimited.add(1);
  if (
    (response.status >= 400 && response.status < 500 && response.status !== 429) ||
    body?.data?.status === 'REJECTED'
  ) {
    businessRejected.add(1);
  }
  if (isAccepted) accepted.add(1);

  check(response, {
    'check-in returns HTTP 200': (result) => result.status === 200,
    'check-in is accepted as VALID or REVIEW': () => isAccepted,
  });
}