import { Injectable } from '@nestjs/common';

@Injectable()
export class GeoService {
  private readonly EARTH_RADIUS_METERS = 6371000;

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Tính khoảng cách giữa 2 điểm tọa độ (đơn vị: mét) bằng công thức Haversine.
   * Công thức này tính khoảng cách theo đường thẳng trên bề mặt cầu (great-circle distance),
   * đủ chính xác cho khoảng cách nhỏ (vài km) như bài toán điểm danh GPS.
   */
  getDistanceInMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Kiểm tra điểm (lat2, lon2) có nằm trong bán kính radiusMeters
   * tính từ tâm (lat1, lon1) hay không.
   */
  isWithinRadius(
    centerLat: number,
    centerLon: number,
    pointLat: number,
    pointLon: number,
    radiusMeters: number,
  ): boolean {
    return (
      this.getDistanceInMeters(centerLat, centerLon, pointLat, pointLon) <=
      radiusMeters
    );
  }
}
