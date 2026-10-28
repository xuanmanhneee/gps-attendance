import { Location } from '@gps-attendance/shared';

import { AttendanceSession } from '../../attendance-sessions/attendance-session.model';
import { GeoService } from '../../geo/geo.service';
import { LocationCheck } from './location.check';

const location = (accuracy: number): Location => ({
  latitude: 10,
  longitude: 106,
  accuracy,
  timestamp: Date.now(),
  isMockLocation: false,
});

const session = (radius: number): AttendanceSession => ({
  id: 1,
  title: 'Session',
  latitude: 10,
  longitude: 106,
  radius,
  openAt: new Date('2026-10-25T00:00:00.000Z'),
  closeAt: new Date('2026-10-25T01:00:00.000Z'),
  status: 'open',
  createdBy: 1,
  createdAt: new Date('2026-10-24T00:00:00.000Z'),
  updatedAt: new Date('2026-10-24T00:00:00.000Z'),
});

const createCheck = (distance: number) => {
  const geoService = {
    getDistanceInMeters: jest.fn().mockReturnValue(distance),
  } as unknown as GeoService;

  return {
    check: new LocationCheck(geoService),
    geoService,
  };
};

describe('LocationCheck', () => {
  it('accepts a location whose distance and accuracy fit inside the radius', () => {
    const { check } = createCheck(40);

    expect(check.evaluate(location(10), session(100))).toEqual({
      coefficient: 1,
      distance: 40,
    });
  });

  it('accepts the exact boundary where distance plus accuracy equals radius', () => {
    const { check } = createCheck(80);

    expect(check.evaluate(location(20), session(100))).toEqual({
      coefficient: 1,
      distance: 80,
    });
  });

  it('rejects a nearby location when its accuracy extends beyond the radius', () => {
    const { check } = createCheck(80);

    expect(check.evaluate(location(21), session(100))).toEqual({
      coefficient: 0,
      distance: 80,
    });
  });

  it('rejects a location whose measured distance is outside the radius', () => {
    const { check, geoService } = createCheck(101);
    const inputLocation = location(0);
    const inputSession = session(100);

    expect(check.evaluate(inputLocation, inputSession)).toEqual({
      coefficient: 0,
      distance: 101,
    });
    expect(geoService.getDistanceInMeters).toHaveBeenCalledWith(
      inputSession.latitude,
      inputSession.longitude,
      inputLocation.latitude,
      inputLocation.longitude,
    );
  });
});
