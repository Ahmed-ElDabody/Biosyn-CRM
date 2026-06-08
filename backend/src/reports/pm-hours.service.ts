import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec §6.3 / §11.2 — PM working span (first PM start → last PM end) must be ≥ 150 min.
export const PM_SPAN_MIN_MINUTES = 150;

export interface PmHoursRow {
  repId: string;
  repName: string;
  date: string; // YYYY-MM-DD (UTC)
  firstPmStart: Date | null;
  lastPmEnd: Date | null;
  spanMinutes: number;
  visitCount: number;
  flagBelowThreshold: boolean;
}

@Injectable()
export class PmHoursService {
  constructor(private prisma: PrismaService) {}

  async report(repIds: string[], from: Date, to: Date): Promise<PmHoursRow[]> {
    if (repIds.length === 0) return [];
    const visits = await this.prisma.visit.findMany({
      where: {
        repId: { in: repIds },
        accountType: 'PM',
        startedAtServer: { gte: from, lt: to },
      },
      select: {
        repId: true,
        startedAtServer: true,
        endedAtServer: true,
        rep: { select: { nameEn: true } },
      },
      orderBy: { startedAtServer: 'asc' },
    });

    type Bucket = {
      repId: string;
      repName: string;
      date: string;
      firstPmStart: Date;
      lastPmEnd: Date;
      visitCount: number;
    };
    const byKey = new Map<string, Bucket>();
    for (const v of visits) {
      const date = v.startedAtServer.toISOString().slice(0, 10);
      const key = `${v.repId}|${date}`;
      const end = v.endedAtServer ?? v.startedAtServer;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          repId: v.repId,
          repName: v.rep.nameEn,
          date,
          firstPmStart: v.startedAtServer,
          lastPmEnd: end,
          visitCount: 1,
        });
      } else {
        if (v.startedAtServer < existing.firstPmStart) existing.firstPmStart = v.startedAtServer;
        if (end > existing.lastPmEnd) existing.lastPmEnd = end;
        existing.visitCount++;
      }
    }

    return Array.from(byKey.values())
      .map((b) => {
        const spanMinutes = Math.round(
          (b.lastPmEnd.getTime() - b.firstPmStart.getTime()) / 60_000,
        );
        return {
          repId: b.repId,
          repName: b.repName,
          date: b.date,
          firstPmStart: b.firstPmStart,
          lastPmEnd: b.lastPmEnd,
          spanMinutes,
          visitCount: b.visitCount,
          flagBelowThreshold: spanMinutes < PM_SPAN_MIN_MINUTES,
        };
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.repName.localeCompare(b.repName)));
  }
}
