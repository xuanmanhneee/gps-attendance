import { LocationCheck } from './location.check';
import { GeoService } from '../../geo/geo.service';

describe('LocationCheck.classify', () => {
  const check = new LocationCheck(new GeoService());

  it('phân loại chắc chắn trong khi distance + accuracy <= radius', () => {
    expect(check.classify(9, 10, 100)).toBe('INSIDE');
  });

  it('phân loại chắc chắn ngoài khi distance - accuracy > radius', () => {
    expect(check.classify(500, 15, 50)).toBe('OUTSIDE');
  });

  it('phân loại chưa chắc chắn với log 8.69m, ±121m, bán kính 50m', () => {
    expect(check.classify(8.69, 121, 50)).toBe('UNCERTAIN');
  });

  it('phân loại chưa chắc chắn khi vùng sai số giao với ranh giới', () => {
    expect(check.classify(55, 15, 50)).toBe('UNCERTAIN');
  });
});
