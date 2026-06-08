import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec §6.3 / §11.4 — interval between consecutive visits must be ≥ 10 min for PM.
export const MIN_INTERVAL_MINUTES = 10;

export interface IntervalRow {
  repId: string;
  repName: string;
  date: string;
  fromVisitId: string;
  toVisitId: string;
  fromAccountType: string;
  toAccountType: string;
  intervalMinutes: number;
  flagBelowThreshold: boolean;
  fromEndedAt: Date | null;
  toStartedAt: Date;
}

@Injectable()
export class VisitIntervalsService {
  constructor(private prisma: PrismaService) {}

  async report(repIds: string[], from: Date, to: Date): Promise<IntervalRow[]> {
    if (repIds.length === 0) return [];
    const visits = await this.prisma.visit.findMany({
      where: { repId: { in: repIds }, startedAtServer: { gte: from, lt: to } },
      select: {
        id: true,
        repId: true,
        accountType: true,
        startedAtServer: true,
        endedAtServer: true,
        rep: { select: { nameEn: true } },
      },
      orderBy: [{ repId: 'asc' }, { startedAtServer: 'asc' }],
    });

    const out: IntervalRow[] = [];
    for (let i = 1; i < visits.length; i++) {
      const prev = visits[i - 1]!;
      const cur = visits[i]!;
      if (prev.repId !== cur.repId) continue;
      const prevEnd = prev.endedAtServer ?? prev.startedAtServer;
      // Same-day grouping based on UTC date — fine for an internal report
      const sameDay =
        prevEnd.toISOString().slice(0, 10) === cur.startedAtServer.toISOString().slice(0, 10);
      if (!sameDay) continue;
      const intervalMinutes =
        (cur.startedAtServer.getTime() - prevEnd.getTime()) / 60_000;
      out.push({
        repId: cur.repId,
        repName: cur.rep.nameEn,
        date: cur.startedAtServer.toISOString().slice(0, 10),
        fromVisitId: prev.id,
        toVisitId: cur.id,
        fromAccountType: prev.accountType,
        toAccountType: cur.accountType,
        intervalMinutes,
        flagBelowThreshold: intervalMinutes < MIN_INTERVAL_MINUTES,
        fromEndedAt: prev.endedAtServer,
        toStartedAt: cur.startedAtServer,
      });
    }
    return out.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.repName.localeCompare(b.repName),
    );
  }
}
