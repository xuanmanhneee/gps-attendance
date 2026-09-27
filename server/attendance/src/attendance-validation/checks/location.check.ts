import { Injectable } from '@nestjs/common';
import { Location } from '@gps-attendance/shared';
import { AttendanceSession } from '../../attendance-sessions/attendance-session.model';
import { GeoService } from '../../geo/geo.service';
import { LocationCheckResult } from '../attendance-validation.types';

/**
 * GPS báo một điểm kèm vòng sai số (accuracy).
 *
 * - Chắc chắn ngoài: distance - accuracy > radius → hệ số 0
 * - Chắc chắn trong: distance + accuracy <= radius → hệ số 1
 * - Chồng lấn: tỉ lệ đoạn [distance ± accuracy] nằm trong bán kính
 *
 * Không cộng accuracy vào distance rồi so sánh cứng với radius
 * (cách đó từ chối người đứng sâu trong lớp khi GPS trong nhà kém).
 */
@Injectable()
export class LocationCheck {
  constructor(private readonly geoService: GeoService) {}

  evaluate(
    location: Location,
    session: AttendanceSession,
  ): LocationCheckResult {
    const distance = this.geoService.getDistanceInMeters(
      session.latitude,
      session.longitude,
      location.latitude,
      location.longitude,
    );

    return {
      coefficient: this.overlapCoefficient(
        distance,
        Math.max(0, location.accuracy),
        session.radius,
      ),
      distance,
    };
  }

  overlapCoefficient(
    distance: number,
    accuracy: number,
    radius: number,
  ): number {
    if (radius <= 0) {
      return 0;
    }

    if (distance - accuracy > radius) {
      return 0;
    }

    if (distance + accuracy <= radius) {
      return 1;
    }

    const inner = Math.max(0, distance - accuracy);
    const outer = distance + accuracy;
    const span = outer - inner;

    if (span <= 0) {
      return distance <= radius ? 1 : 0;
    }

    const inside = Math.max(0, Math.min(outer, radius) - inner);
    return Math.min(1, inside / span);
  }
}
