import http from 'k6/http';
import { check } from 'k6';

const fixture = JSON.parse(open('/data/load-data.json'));
if (fixture.users.length < 3) throw new Error('Prepare at least three users');

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: { checks: ['rate==1'] },
};

function requestFor(user, deviceId) {
  return [
    'POST',
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
        deviceId,
        platform: 'android',
        model: 'Race test device',
      },
      integrity: {
        integrityToken: JSON.stringify({
          deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'],
          securityChecks: { isRealDevice: true, offlineAttestation: true },
        }),
      },
    }),
    {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    },
  ];
}

function outcome(response) {
  const body = response.json();
  if (body.success) return body.data.status;
  return body.code;
}

export default function () {
  const sharedDevice = `race-shared-${fixture.sessionId}`;
  const differentUsers = http.batch([
    requestFor(fixture.users[0], sharedDevice),
    requestFor(fixture.users[1], sharedDevice),
  ]);
  const deviceOutcomes = differentUsers.map(outcome).sort();
  check(deviceOutcomes, {
    'one student per device': (values) =>
      JSON.stringify(values) === JSON.stringify(['REJECTED', 'VALID']),
  });
  check(differentUsers, {
    'duplicate device reason': (responses) =>
      responses.some(
        (response) =>
          response.json().data?.reasons?.[0] === 'DUPLICATE_DEVICE',
      ),
  });

  const sameUser = http.batch([
    requestFor(fixture.users[2], `race-user-a-${fixture.sessionId}`),
    requestFor(fixture.users[2], `race-user-b-${fixture.sessionId}`),
  ]);
  const userOutcomes = sameUser.map(outcome).sort();
  check(userOutcomes, {
    'one check-in per student': (values) =>
      JSON.stringify(values) === JSON.stringify(['ALREADY_CHECKED_IN', 'VALID']),
  });
}
