import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_TZ_OFFSET_MIN } from '../common/dates';

// Spec §6.2 / §11.3
export const AM_LATE_HOUR_LOCAL = 11; // first AM must start before 11:00 local
export const AM_DAILY_TARGET = 2;

export interface AmVisitRow {
  visitId: string;
  doctorId: string;
  doctorNameAr: string;
  startedAtServer: Date;
  lateFirstAm: boolean;
}

export interface AmDayRow {
  repId: string;
  repName: string;
  date: string; // YYYY-MM-DD (local-day)
  amCount: number;
  flagBelowTarget: boolean;
  firstAmLocalHour: number | null;
  firstAmLate: boolean;
  visits: AmVisitRow[];
}

@Injectable()
export class AmAccountsService {
  constructor(private prisma: PrismaService) {}

  async report(repIds: string[], from: Date, to: Date): Promise<AmDayRow[]> {
    if (repIds.length === 0) return [];
    const visits = await this.prisma.visit.findMany({
      where: {
        repId: { in: repIds },
        accountType: 'AM',
        startedAtServer: { gte: from, lt: to },
      },
      select: {
        id: true,
        repId: true,
        doctorId: true,
        startedAtServer: true,
        rep: { select: { nameEn: true } },
        doctor: { select: { nameAr: true } },
      },
      orderBy: { startedAtServer: 'asc' },
    });

    const tzMs = DEFAULT_TZ_OFFSET_MIN * 60_000;
    type Bucket = {
      repId: string;
      repName: string;
      date: string;
      visits: AmVisitRow[];
      firstLocal: Date;
    };
    const byKey = new Map<string, Bucket>();
    for (const v of visits) {
      const localTs = new Date(v.startedAtServer.getTime() + tzMs);
      const date = localTs.toISOString().slice(0, 10);
      const key = `${v.repId}|${date}`;
      const lateFirstAm = false; // placeholder; computed once we know which is first

      const row: AmVisitRow = {
        visitId: v.id,
        doctorId: v.doctorId,
        doctorNameAr: v.doctor.nameAr,
        startedAtServer: v.startedAtServer,
        lateFirstAm,
      };
      const b = byKey.get(key);
      if (!b) {
        byKey.set(key, {
          repId: v.repId,
          repName: v.rep.nameEn,
          date,
          visits: [row],
          firstLocal: localTs,
        });
      } else {
        b.visits.push(row);
        if (localTs < b.firstLocal) b.firstLocal = localTs;
      }
    }

    return Array.from(byKey.values())
      .map((b) => {
        const firstAmLocalHour = b.firstLocal.getUTCHours();
        const firstAmLate = firstAmLocalHour >= AM_LATE_HOUR_LOCAL;
        // Mark only the chronologically first visit in the day as "late first AM"
        b.visits.sort((a, c) => a.startedAtServer.getTime() - c.startedAtServer.getTime());
        if (b.visits.length > 0) b.visits[0]!.lateFirstAm = firstAmLate;
        return {
          repId: b.repId,
          repName: b.repName,
          date: b.date,
          amCount: b.visits.length,
          flagBelowTarget: b.visits.length < AM_DAILY_TARGET,
          firstAmLocalHour,
          firstAmLate,
          visits: b.visits,
        };
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.repName.localeCompare(b.repName)));
  }
}
