import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { haversineMeters } from '../geofence/geofence.service';
import { SHORT_DWELL_SECONDS } from './thresholds';

const NO_MOVEMENT_METERS = 25; // consecutive visits within this radius => "no movement" flag

export interface RouteStop {
  visitId: string;
  doctorId: string;
  doctorNameAr: string;
  accountType: string;
  startedAtServer: Date;
  endedAtServer: Date | null;
  dwellSeconds: number;
  gpsLat: number | null;
  gpsLng: number | null;
  isValid: boolean;
  flags: {
    nearZeroDwell: boolean;
    noMovementFromPrev: boolean;
    distanceFromPrevMeters: number | null;
  };
}

@Injectable()
export class RouteReplayService {
  constructor(private prisma: PrismaService) {}

  /** Full daily route for one rep. `day` is interpreted as the UTC date covered. */
  async dayRoute(repId: string, day: Date): Promise<{ repId: string; date: string; stops: RouteStop[] }> {
    const from = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
    );
    const to = new Date(from.getTime() + 24 * 3600_000);

    const visits = await this.prisma.visit.findMany({
      where: { repId, startedAtServer: { gte: from, lt: to } },
      include: {
        doctor: { select: { id: true, nameAr: true } },
      },
      orderBy: { startedAtServer: 'asc' },
    });

    const stops: RouteStop[] = [];
    let prevLat: number | null = null;
    let prevLng: number | null = null;
    for (const v of visits) {
      const dwellSeconds = v.endedAtServer
        ? Math.round((v.endedAtServer.getTime() - v.startedAtServer.getTime()) / 1000)
        : 0;
      const nearZeroDwell = dwellSeconds < SHORT_DWELL_SECONDS;
      let distanceFromPrev: number | null = null;
      let noMovementFromPrev = false;
      if (prevLat !== null && prevLng !== null && v.gpsLat !== null && v.gpsLng !== null) {
        distanceFromPrev = haversineMeters(prevLat, prevLng, v.gpsLat, v.gpsLng);
        noMovementFromPrev = distanceFromPrev < NO_MOVEMENT_METERS;
      }
      stops.push({
        visitId: v.id,
        doctorId: v.doctorId,
        doctorNameAr: v.doctor.nameAr,
        accountType: v.accountType,
        startedAtServer: v.startedAtServer,
        endedAtServer: v.endedAtServer,
        dwellSeconds,
        gpsLat: v.gpsLat,
        gpsLng: v.gpsLng,
        isValid: v.isValid,
        flags: { nearZeroDwell, noMovementFromPrev, distanceFromPrevMeters: distanceFromPrev },
      });
      prevLat = v.gpsLat;
      prevLng = v.gpsLng;
    }

    return {
      repId,
      date: from.toISOString().slice(0, 10),
      stops,
    };
  }
}
