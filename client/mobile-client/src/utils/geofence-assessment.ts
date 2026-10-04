export type GeofenceStatus = 'unknown' | 'inside' | 'outside';

export interface GeofenceAssessment {
  status: GeofenceStatus;
  nearBoundary: boolean;
}

export function assessGeofence(
  distanceMeters: number | null,
  radiusMeters: number,
  accuracyMeters: number | null,
): GeofenceAssessment {
  if (distanceMeters === null) {
    return { status: 'unknown', nearBoundary: false };
  }

  return {
    status: distanceMeters <= radiusMeters ? 'inside' : 'outside',
    nearBoundary:
      accuracyMeters !== null &&
      accuracyMeters >= 0 &&
      Math.abs(distanceMeters - radiusMeters) <= accuracyMeters,
  };
}
