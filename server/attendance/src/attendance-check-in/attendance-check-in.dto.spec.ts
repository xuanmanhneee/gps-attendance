import { validateSync } from 'class-validator';

import { LocationDto } from './attendance-check-in.dto';

const validLocation = {
  latitude: 10,
  longitude: 106,
  accuracy: 5,
  timestamp: 1_000,
  isMockLocation: false,
};

const validateLocation = (overrides: Partial<LocationDto> = {}) =>
  validateSync(Object.assign(new LocationDto(), validLocation, overrides));

const findError = (property: keyof LocationDto, value: number) =>
  validateLocation({ [property]: value }).find(
    (error) => error.property === property,
  );

describe('LocationDto coordinates', () => {
  it.each([-90, 90])('accepts latitude boundary %s', (latitude) => {
    expect(findError('latitude', latitude)).toBeUndefined();
  });

  it('rejects latitude outside [-90, 90]', () => {
    expect(findError('latitude', -90.001)?.constraints?.min).toBeDefined();
    expect(findError('latitude', 90.001)?.constraints?.max).toBeDefined();
  });

  it.each([-180, 180])('accepts longitude boundary %s', (longitude) => {
    expect(findError('longitude', longitude)).toBeUndefined();
  });

  it('rejects longitude outside [-180, 180]', () => {
    expect(findError('longitude', -180.001)?.constraints?.min).toBeDefined();
    expect(findError('longitude', 180.001)?.constraints?.max).toBeDefined();
  });
});

describe('LocationDto metadata', () => {
  it('accepts zero accuracy and timestamp', () => {
    expect(findError('accuracy', 0)).toBeUndefined();
    expect(findError('timestamp', 0)).toBeUndefined();
  });

  it('rejects negative accuracy', () => {
    expect(findError('accuracy', -0.001)?.constraints?.min).toBeDefined();
  });

  it('rejects negative timestamp', () => {
    expect(findError('timestamp', -1)?.constraints?.min).toBeDefined();
  });
});
