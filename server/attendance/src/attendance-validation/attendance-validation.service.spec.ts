import { AttendanceValidationService } from './attendance-validation.service';
import { IntegrityCheck } from './checks/integrity.check';
import { LocationCheck } from './checks/location.check';
import { MockLocationCheck } from './checks/mock-location.check';
import { GeoService } from '../geo/geo.service';
import { AttendanceSession } from '../attendance-sessions/attendance-session.model';
import { LocationPayload, DevicePayload, DeviceIntegrityPayload } from '@gps-attendance/shared';

describe('AttendanceValidationService', () => {
  let validationService: AttendanceValidationService;
  let geoService: GeoService;
  let integrityCheck: IntegrityCheck;
  let locationCheck: LocationCheck;
  let mockLocationCheck: MockLocationCheck;

  const mockSession: AttendanceSession = {
    id: 1,
    title: 'Lập trình Web K45',
    latitude: 11.9545,
    longitude: 108.4452,
    radius: 50,
    openAt: new Date(Date.now() - 1000 * 60 * 10),
    closeAt: new Date(Date.now() + 1000 * 60 * 50),
    status: 'open',
    createdBy: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultDevice: DevicePayload = {
    deviceId: 'DEV-TEST-001',
    platform: 'android',
    model: 'Pixel 8',
  };

  const defaultIntegrity: DeviceIntegrityPayload = {
    integrityToken: 'valid-integrity-token',
  };

  beforeEach(() => {
    geoService = new GeoService();
    integrityCheck = new IntegrityCheck();
    locationCheck = new LocationCheck(geoService);
    mockLocationCheck = new MockLocationCheck();

    validationService = new AttendanceValidationService(
      integrityCheck,
      mockLocationCheck,
      locationCheck,
    );
  });

  describe('Phát hiện Mock Location', () => {
    it('nên từ chối ngay lập tức (REJECTED) khi isMockLocation là true', () => {
      const mockLocation: LocationPayload = {
        latitude: mockSession.latitude,
        longitude: mockSession.longitude,
        accuracy: 10,
        timestamp: Date.now(),
        isMockLocation: true,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: mockLocation,
        device: defaultDevice,
        integrity: defaultIntegrity,
      });

      expect(result.status).toBe('REJECTED');
      expect(result.reasons).toContain('MOCK_LOCATION');
    });
  });

  describe('Kiểm tra cự ly (distance so với radius)', () => {
    it('đưa vào REVIEW khi accuracy vượt threshold đã snapshot dù tọa độ nằm trong radius', () => {
      const calibratedSession = { ...mockSession, gpsAccuracyThreshold: 20 };
      const location: LocationPayload = {
        latitude: calibratedSession.latitude + 0.00008,
        longitude: calibratedSession.longitude,
        accuracy: 25,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: calibratedSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location,
        device: defaultDevice,
        integrity: defaultIntegrity,
      });

      expect(result.status).toBe('REVIEW');
      expect(result.reasons).toContain('LOW_LOCATION_ACCURACY');
    });

    it('nên trả về VALID khi tọa độ nằm trong bán kính và độ tin cậy cao', () => {
      // Tọa độ gần tâm (~10m)
      const validLocation: LocationPayload = {
        latitude: mockSession.latitude + 0.00008,
        longitude: mockSession.longitude,
        accuracy: 10,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: validLocation,
        device: defaultDevice,
        integrity: defaultIntegrity,
      });

      expect(result.status).toBe('VALID');
      expect(result.reasons).toHaveLength(0);
      expect(result.distance).toBeLessThan(mockSession.radius);
    });

    it('nên gắn REVIEW hoặc REJECTED khi độ tin cậy GPS thấp và integrity yếu dù điểm vào trong bán kính', () => {
      const weakLocation: LocationPayload = {
        latitude: mockSession.latitude + 0.00015,
        longitude: mockSession.longitude,
        accuracy: 65,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: weakLocation,
        device: defaultDevice,
        integrity: { integrityToken: '' },
      });

      expect(['REVIEW', 'REJECTED']).toContain(result.status);
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/LOW_LOCATION_ACCURACY|LOW_CONFIDENCE_SCORE/),
        ]),
      );
    });

    it('nên từ chối (REJECTED) với lý do OUT_OF_RANGE khi khoảng cách vượt quá xa bán kính', () => {
      // Tọa độ cách xa hơn 500m
      const farLocation: LocationPayload = {
        latitude: mockSession.latitude + 0.005,
        longitude: mockSession.longitude,
        accuracy: 15,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: farLocation,
        device: defaultDevice,
        integrity: defaultIntegrity,
      });

      expect(result.status).toBe('REJECTED');
      expect(result.reasons).toContain('OUT_OF_RANGE');
      expect(result.distance).toBeGreaterThan(mockSession.radius);
    });

    it('đưa vào REVIEW khi vị trí nằm trong bán kính nhưng sai số giao với ranh giới', () => {
      const indoorSession = { ...mockSession, radius: 100 };
      const nearCenter: LocationPayload = {
        latitude: indoorSession.latitude + 9 / 111_320,
        longitude: indoorSession.longitude,
        accuracy: 106,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: indoorSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: nearCenter,
        device: defaultDevice,
        integrity: { integrityToken: null },
      });

      expect(result.status).toBe('REVIEW');
      expect(result.reasons).toContain('LOW_LOCATION_ACCURACY');
      expect(result.distance).toBeLessThan(indoorSession.radius);
    });

    it('đưa log 8.69m, ±121m, bán kính 50m vào REVIEW thay vì từ chối theo điểm số', () => {
      const uncertainLocation: LocationPayload = {
        latitude: mockSession.latitude + 8.69 / 111_320,
        longitude: mockSession.longitude,
        accuracy: 121,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: uncertainLocation,
        device: defaultDevice,
        integrity: { integrityToken: null },
      });

      expect(result.status).toBe('REVIEW');
      expect(result.reasons).toEqual(
        expect.arrayContaining(['LOW_LOCATION_ACCURACY']),
      );
      expect(result.distance).toBeCloseTo(8.69, 0);
    });

    it('nên đánh dấu REVIEW khi khoảng cách nằm sát mép ngoài nhưng trong phạm vi sai số GPS (borderline)', () => {
      // Bán kính là 50m. Giả lập điểm cách tâm ~55m với accuracy = 15m (55 <= 50 + 15)
      const borderlineLat = mockSession.latitude + 0.00050; // ~55m
      const borderlineLocation: LocationPayload = {
        latitude: borderlineLat,
        longitude: mockSession.longitude,
        accuracy: 15,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: borderlineLocation,
        device: defaultDevice,
        integrity: defaultIntegrity,
      });

      expect(result.status).toBe('REVIEW');
      expect(result.reasons).toContain('LOW_LOCATION_ACCURACY');
    });

    it('nên từ chối với lỗi LOW_LOCATION_ACCURACY khi vị trí không chắc chắn và integrity yếu', () => {
      const weakLocation: LocationPayload = {
        latitude: mockSession.latitude + 0.00040,
        longitude: mockSession.longitude,
        accuracy: 80,
        timestamp: Date.now(),
        isMockLocation: false,
      };

      const result = validationService.validate({
        session: mockSession,
        userId: 10,
        existingRecordCount: 0,
        checkedInAt: new Date(),
        location: weakLocation,
        device: defaultDevice,
        integrity: { integrityToken: '' },
      });

      expect(result.status).toBe('REJECTED');
      expect(result.reasons).toContain('LOW_LOCATION_ACCURACY');
      expect(result.reasons).toContain('LOW_CONFIDENCE_SCORE');
    });
  });
});
