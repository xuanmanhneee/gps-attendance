import { Injectable } from '@nestjs/common';
import { Location } from '@gps-attendance/shared';
import { AttendanceSession } from '../../attendance-sessions/attendance-session.model';
import { GeoService } from '../../geo/geo.service';
import {
  LocationCertainty,
  LocationCheckResult,
} from '../attendance-validation.types';

/**
 * Phân loại vùng có thể có của vị trí GPS dựa trên khoảng cách và sai số.
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
    const accuracy = Math.max(0, location.accuracy);

    return {
      certainty: this.classify(distance, accuracy, session.radius),
      distance,
    };
  }

  classify(
    distance: number,
    accuracy: number,
    radius: number,
  ): LocationCertainty {
    if (radius <= 0) {
      return 'OUTSIDE';
    }

    if (distance - accuracy > radius) {
      return 'OUTSIDE';
    }

    if (distance + accuracy <= radius) {
      return 'INSIDE';
    }

    return 'UNCERTAIN';
  }
}
