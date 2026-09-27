import { LocationCheck } from './location.check';
import { GeoService } from '../../geo/geo.service';

describe('LocationCheck.overlapCoefficient', () => {
  const check = new LocationCheck(new GeoService());

  it('chắc chắn trong → 1 (distance + accuracy <= radius)', () => {
    expect(check.overlapCoefficient(9, 10, 100)).toBe(1);
  });

  it('chắc chắn ngoài → 0 (distance - accuracy > radius)', () => {
    expect(check.overlapCoefficient(500, 15, 50)).toBe(0);
  });

  it('đứng sâu trong bán kính nhưng GPS kém (9m, ±106m, radius 100m) → hệ số cao, không phải 0', () => {
    const coefficient = check.overlapCoefficient(9, 106, 100);
    expect(coefficient).toBeGreaterThan(0.8);
    expect(coefficient).toBeLessThan(1);
  });

  it('sát mép ngoài trong phạm vi sai số → hệ số trung bình, không phải 0', () => {
    const coefficient = check.overlapCoefficient(55, 15, 50);
    expect(coefficient).toBeGreaterThan(0);
    expect(coefficient).toBeLessThan(1);
  });
});
