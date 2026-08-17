import { Injectable } from '@nestjs/common';
import { LocationPayload } from '@gps-attendance/shared-types';
import { AttendanceSession } from '../../attendance-sessions/attendance-session.model';
import { GeoService } from '../../geo/geo.service';
import { LocationCheckResult } from '../attendance-validation.types';


@Injectable()
export class LocationCheck {
  constructor(
    private readonly geoService: GeoService,
  ) {}

  evaluate(
    location: LocationPayload,
    session: AttendanceSession,
  ): LocationCheckResult {
    const distance = this.geoService.getDistanceInMeters(
      session.latitude,
      session.longitude,
      location.latitude,
      location.longitude,
    );

    const isValid =
      distance + location.accuracy <= session.radius;

    return {
      coefficient: isValid ? 1 : 0,
      distance,
    };
  }
}