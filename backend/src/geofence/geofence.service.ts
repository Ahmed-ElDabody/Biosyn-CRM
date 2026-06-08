import { Injectable } from '@nestjs/common';
import { AccountType } from '@prisma/client';

// Spec §6.2 (AM 150 m), §6.3 (PM 100 m). Spec §9.2: "Even 1 meter outside = rejected."
export const GEOFENCE_RADIUS_METERS: Record<AccountType, number> = {
  AM: 150,
  PM: 100,
};

const EARTH_RADIUS_METERS = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two lat/lng points, in meters.
 * Accurate enough for sub-150m geofence checks (sub-meter error).
 * PostGIS is configured and available for future spatial joins; we use
 * JS here because it's a single point-to-point check at visit time.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

@Injectable()
export class GeofenceService {
  /**
   * Per spec §9.2 "Even 1 meter outside = rejected." Strict: distance must
   * be <= radius (in meters).
   */
  isInside(
    visitLat: number,
    visitLng: number,
    clinicLat: number,
    clinicLng: number,
    accountType: AccountType,
  ): { ok: boolean; distance: number; radius: number } {
    const radius = GEOFENCE_RADIUS_METERS[accountType];
    const distance = haversineMeters(visitLat, visitLng, clinicLat, clinicLng);
    return { ok: distance <= radius, distance, radius };
  }
}
