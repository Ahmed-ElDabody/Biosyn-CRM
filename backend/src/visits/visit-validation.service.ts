import { Injectable } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { GeofenceService } from '../geofence/geofence.service';

// Spec §9.2 — valid-visit conditions:
//   1) >= 5 slides browsed (across all sessions in the visit)
//   2) session/visit duration >= 30 seconds
//   3) inside geofence (AM 150m / PM 100m); 1m outside => rejected
//   4) no GPS spoofing (mock_location_detected on any session)
export const MIN_SLIDES_FOR_VALID = 5;
export const MIN_DURATION_SECONDS = 30;

// Spec §10.2 — server time is source of truth. Flag drift > 10 minutes.
export const CLOCK_DRIFT_FLAG_SECONDS = 10 * 60;
// Spec §6.3 — interval between consecutive visits >= 10 min for PM
export const MIN_INTERVAL_MINUTES = 10;
// Spec §6.2 — first AM visit must be before 11:00 AM (later = flag, not reject)
export const AM_LATE_HOUR = 11;
// Spec §6.3 — PM visits must be after 12:00 PM (earlier = flag)
export const PM_EARLIEST_HOUR = 12;

export interface SessionInput {
  slidesSeen: number;
  durationSeconds: number;
  mockLocationDetected?: boolean;
  clockDriftSeconds?: number;
}

export interface VisitValidationInput {
  accountType: AccountType;
  visitLat: number | null;
  visitLng: number | null;
  clinicLat: number | null;
  clinicLng: number | null;
  startedAtServer: Date;
  endedAtServer: Date | null;
  startedAtClient: Date | null;
  endedAtClient: Date | null;
  sessions: SessionInput[];
  previousVisitEndedAtServer?: Date | null;
}

export interface VisitValidationResult {
  isValid: boolean;
  geofenceOk: boolean;
  validityReasons: {
    slidesOk: boolean;
    durationOk: boolean;
    geofenceOk: boolean;
    noSpoofing: boolean;
    geofenceDistance: number | null;
    geofenceRadius: number | null;
    totalSlides: number;
    durationSeconds: number;
  };
  flags: {
    lateFirstAm: boolean;
    pmBeforeNoon: boolean;
    shortIntervalFromPrev: boolean;
    largeClockDrift: boolean;
    intervalMinutesFromPrev: number | null;
    maxClockDriftSeconds: number;
  };
}

@Injectable()
export class VisitValidationService {
  constructor(private geofence: GeofenceService) {}

  validate(input: VisitValidationInput): VisitValidationResult {
    const totalSlides = input.sessions.reduce((sum, s) => sum + (s.slidesSeen ?? 0), 0);
    const slidesOk = totalSlides >= MIN_SLIDES_FOR_VALID;

    const durationSeconds = input.endedAtServer
      ? Math.max(
          0,
          Math.round((input.endedAtServer.getTime() - input.startedAtServer.getTime()) / 1000),
        )
      : 0;
    const durationOk = durationSeconds >= MIN_DURATION_SECONDS;

    let geofenceOk = false;
    let geofenceDistance: number | null = null;
    let geofenceRadius: number | null = null;
    if (
      input.visitLat !== null &&
      input.visitLng !== null &&
      input.clinicLat !== null &&
      input.clinicLng !== null
    ) {
      const r = this.geofence.isInside(
        input.visitLat,
        input.visitLng,
        input.clinicLat,
        input.clinicLng,
        input.accountType,
      );
      geofenceOk = r.ok;
      geofenceDistance = r.distance;
      geofenceRadius = r.radius;
    }

    const noSpoofing = !input.sessions.some((s) => s.mockLocationDetected === true);
    const isValid = slidesOk && durationOk && geofenceOk && noSpoofing;

    // Soft flags
    const startHourLocal = input.startedAtServer.getUTCHours(); // server stores UTC; UI applies TZ
    const lateFirstAm = input.accountType === 'AM' && startHourLocal >= AM_LATE_HOUR;
    const pmBeforeNoon = input.accountType === 'PM' && startHourLocal < PM_EARLIEST_HOUR;

    let intervalMinutesFromPrev: number | null = null;
    let shortIntervalFromPrev = false;
    if (input.previousVisitEndedAtServer) {
      intervalMinutesFromPrev =
        (input.startedAtServer.getTime() - input.previousVisitEndedAtServer.getTime()) /
        60000;
      shortIntervalFromPrev = intervalMinutesFromPrev < MIN_INTERVAL_MINUTES;
    }

    const maxClockDriftSeconds = input.sessions.reduce(
      (max, s) => Math.max(max, Math.abs(s.clockDriftSeconds ?? 0)),
      0,
    );
    const largeClockDrift = maxClockDriftSeconds > CLOCK_DRIFT_FLAG_SECONDS;

    return {
      isValid,
      geofenceOk,
      validityReasons: {
        slidesOk,
        durationOk,
        geofenceOk,
        noSpoofing,
        geofenceDistance,
        geofenceRadius,
        totalSlides,
        durationSeconds,
      },
      flags: {
        lateFirstAm,
        pmBeforeNoon,
        shortIntervalFromPrev,
        largeClockDrift,
        intervalMinutesFromPrev,
        maxClockDriftSeconds,
      },
    };
  }
}
