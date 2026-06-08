import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OFFLINE_LAG_FLAG_HOURS,
  SAME_LOCATION_DECIMALS,
  SAME_LOCATION_MIN_CLUSTER,
  SHORT_DWELL_SECONDS,
} from './thresholds';

interface Window {
  repIds: string[];
  from: Date;
  to: Date;
}

@Injectable()
export class IntegrityService {
  constructor(private prisma: PrismaService) {}

  async mockGpsReport({ repIds, from, to }: Window) {
    const sessions = await this.prisma.session.findMany({
      where: {
        mockLocationDetected: true,
        visit: {
          repId: { in: repIds },
          startedAtServer: { gte: from, lt: to },
        },
      },
      include: {
        visit: {
          select: {
            id: true,
            repId: true,
            doctorId: true,
            startedAtServer: true,
            gpsLat: true,
            gpsLng: true,
            rep: { select: { id: true, nameEn: true } },
            doctor: { select: { id: true, nameAr: true } },
          },
        },
      },
    });
    return sessions.map((s) => ({
      sessionId: s.id,
      visit: s.visit,
      deviceInfo: s.deviceInfo,
    }));
  }

  async clockDriftReport({ repIds, from, to }: Window) {
    const sessions = await this.prisma.session.findMany({
      where: {
        // Both directions of drift
        OR: [
          { clockDriftSeconds: { gt: 600 } }, // > 10 min ahead
          { clockDriftSeconds: { lt: -600 } }, // > 10 min behind
        ],
        visit: {
          repId: { in: repIds },
          startedAtServer: { gte: from, lt: to },
        },
      },
      include: {
        visit: {
          select: {
            id: true,
            repId: true,
            startedAtServer: true,
            rep: { select: { id: true, nameEn: true } },
            doctor: { select: { id: true, nameAr: true } },
          },
        },
      },
      orderBy: { clockDriftSeconds: 'desc' },
    });
    return sessions.map((s) => ({
      sessionId: s.id,
      driftSeconds: s.clockDriftSeconds,
      visit: s.visit,
    }));
  }

  async offlineLagReport({ repIds, from, to }: Window) {
    const visits = await this.prisma.visit.findMany({
      where: {
        repId: { in: repIds },
        startedAtServer: { gte: from, lt: to },
        syncedAt: { not: null },
      },
      select: {
        id: true,
        repId: true,
        doctorId: true,
        startedAtServer: true,
        syncedAt: true,
        rep: { select: { id: true, nameEn: true } },
        doctor: { select: { id: true, nameAr: true } },
      },
    });
    const lagMs = OFFLINE_LAG_FLAG_HOURS * 3600_000;
    return visits
      .map((v) => ({
        ...v,
        offlineLagSeconds: v.syncedAt
          ? Math.round((v.syncedAt.getTime() - v.startedAtServer.getTime()) / 1000)
          : 0,
      }))
      .filter((v) => v.offlineLagSeconds * 1000 > lagMs)
      .sort((a, b) => b.offlineLagSeconds - a.offlineLagSeconds);
  }

  async sameLocationReport({ repIds, from, to }: Window) {
    const visits = await this.prisma.visit.findMany({
      where: {
        repId: { in: repIds },
        startedAtServer: { gte: from, lt: to },
        gpsLat: { not: null },
        gpsLng: { not: null },
      },
      select: {
        id: true,
        repId: true,
        gpsLat: true,
        gpsLng: true,
        startedAtServer: true,
        rep: { select: { id: true, nameEn: true } },
      },
    });

    // Cluster by rep + rounded coords
    const clusters = new Map<string, typeof visits>();
    for (const v of visits) {
      if (v.gpsLat === null || v.gpsLng === null) continue;
      const key = `${v.repId}|${v.gpsLat.toFixed(SAME_LOCATION_DECIMALS)},${v.gpsLng.toFixed(SAME_LOCATION_DECIMALS)}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(v);
    }
    return Array.from(clusters.entries())
      .filter(([, arr]) => arr.length >= SAME_LOCATION_MIN_CLUSTER)
      .map(([key, arr]) => ({
        repId: arr[0]!.repId,
        rep: arr[0]!.rep,
        lat: arr[0]!.gpsLat,
        lng: arr[0]!.gpsLng,
        count: arr.length,
        visitIds: arr.map((v) => v.id),
        first: arr.reduce((min, v) => (v.startedAtServer < min ? v.startedAtServer : min), arr[0]!.startedAtServer),
        last: arr.reduce((max, v) => (v.startedAtServer > max ? v.startedAtServer : max), arr[0]!.startedAtServer),
        clusterKey: key,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async shortDwellReport({ repIds, from, to }: Window) {
    const visits = await this.prisma.visit.findMany({
      where: {
        repId: { in: repIds },
        startedAtServer: { gte: from, lt: to },
        endedAtServer: { not: null },
      },
      select: {
        id: true,
        repId: true,
        doctorId: true,
        startedAtServer: true,
        endedAtServer: true,
        isValid: true,
        rep: { select: { id: true, nameEn: true } },
        doctor: { select: { id: true, nameAr: true } },
      },
    });
    return visits
      .map((v) => ({
        ...v,
        dwellSeconds: v.endedAtServer
          ? Math.round((v.endedAtServer.getTime() - v.startedAtServer.getTime()) / 1000)
          : 0,
      }))
      .filter((v) => v.dwellSeconds < SHORT_DWELL_SECONDS)
      .sort((a, b) => a.dwellSeconds - b.dwellSeconds);
  }
}
