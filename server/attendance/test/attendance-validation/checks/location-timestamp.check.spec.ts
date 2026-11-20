import { Location } from '@gps-attendance/shared';

import { LocationTimestampCheck } from '../../../src/attendance-validation/checks/location-timestamp.check';

const checkedInAt = new Date('2026-10-25T00:00:30.000Z');
const locationAt = (timestamp: number): Location => ({
  latitude: 10,
  longitude: 106,
  accuracy: 5,
  timestamp,
  isMockLocation: false,
});

describe('LocationTimestampCheck', () => {
  const check = new LocationTimestampCheck();

  it('accepts a location up to two minutes old', () => {
    const location = locationAt(checkedInAt.getTime() - 120_000);

    expect(check.evaluate(location, checkedInAt)).toEqual({
      isValid: true,
      ageMs: 120_000,
    });
  });

  it('rejects a location older than two minutes', () => {
    const location = locationAt(checkedInAt.getTime() - 120_001);

    expect(check.evaluate(location, checkedInAt)).toEqual({
      isValid: false,
      ageMs: 120_001,
    });
  });

  it('accepts at most 30 seconds of client clock skew into the future', () => {
    const location = locationAt(checkedInAt.getTime() + 30_000);

    expect(check.evaluate(location, checkedInAt)).toEqual({
      isValid: true,
      ageMs: -30_000,
    });
  });

  it('rejects a timestamp too far into the future', () => {
    const location = locationAt(checkedInAt.getTime() + 30_001);

    expect(check.evaluate(location, checkedInAt)).toEqual({
      isValid: false,
      ageMs: -30_001,
    });
  });
});
