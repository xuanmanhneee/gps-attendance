import { GeoService } from './geo.service';

describe('GeoService', () => {
  let geoService: GeoService;

  beforeEach(() => {
    geoService = new GeoService();
  });

  describe('getDistanceInMeters', () => {
    it('nên trả về 0 mét khi 2 điểm tọa độ trùng nhau', () => {
      const distance = geoService.getDistanceInMeters(
        11.9545,
        108.4452,
        11.9545,
        108.4452,
      );
      expect(distance).toBeCloseTo(0, 1);
    });

    it('nên tính toán chính xác khoảng cách giữa 2 điểm đã biết (Đại học Đà Lạt đến Hồ Xuân Hương)', () => {
      // Tọa độ ĐH Đà Lạt: ~11.9545, 108.4452
      // Tọa độ Hồ Xuân Hương: ~11.9404, 108.4378
      // Khoảng cách thực tế ~1.7 - 1.8 km (1700 - 1800m)
      const distance = geoService.getDistanceInMeters(
        11.9545,
        108.4452,
        11.9404,
        108.4378,
      );
      expect(distance).toBeGreaterThan(1600);
      expect(distance).toBeLessThan(1900);
    });

    it('nên tính toán chính xác khoảng cách cự ly gần (~50m)', () => {
      // 0.00045 độ vĩ tuyến ~ 50 mét
      const lat1 = 21.028511;
      const lon1 = 105.804817;
      const lat2 = 21.028961;
      const lon2 = 105.804817;

      const distance = geoService.getDistanceInMeters(lat1, lon1, lat2, lon2);
      expect(distance).toBeGreaterThan(45);
      expect(distance).toBeLessThan(55);
    });
  });

  describe('isWithinRadius', () => {
    const centerLat = 11.9545;
    const centerLon = 108.4452;
    const radius = 50; // 50 mét

    it('nên trả về true khi điểm nằm hoàn toàn bên trong bán kính', () => {
      // Điểm cách tâm ~10m
      const pointLat = centerLat + 0.00008;
      const pointLon = centerLon;

      const result = geoService.isWithinRadius(
        centerLat,
        centerLon,
        pointLat,
        pointLon,
        radius,
      );
      expect(result).toBe(true);
    });

    it('nên trả về false khi điểm nằm ngoài bán kính', () => {
      // Điểm cách tâm ~100m
      const pointLat = centerLat + 0.0009;
      const pointLon = centerLon;

      const result = geoService.isWithinRadius(
        centerLat,
        centerLon,
        pointLat,
        pointLon,
        radius,
      );
      expect(result).toBe(false);
    });

    it('nên trả về true khi điểm trùng khớp với tâm', () => {
      const result = geoService.isWithinRadius(
        centerLat,
        centerLon,
        centerLat,
        centerLon,
        radius,
      );
      expect(result).toBe(true);
    });
  });
});
