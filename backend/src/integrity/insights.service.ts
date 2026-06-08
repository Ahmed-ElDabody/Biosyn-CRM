import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, startOfNextMonth } from '../common/dates';
import { SHORT_DWELL_SECONDS } from './thresholds';

export interface Insight {
  severity: 'info' | 'warn' | 'critical';
  text: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Plain-language insights across the requested rep set for the current
   * month. Rule-based — keep it tight; an LLM-backed version can layer in
   * later behind the same interface.
   */
  async generate(repIds: string[], now: Date = new Date()): Promise<Insight[]> {
    if (repIds.length === 0) return [];
    const from = startOfMonth(now);
    const to = startOfNextMonth(now);

    const visits = await this.prisma.visit.findMany({
      where: { repId: { in: repIds }, startedAtServer: { gte: from, lt: to } },
      select: {
        id: true,
        repId: true,
        accountType: true,
        isValid: true,
        startedAtServer: true,
        endedAtServer: true,
        flags: true,
        sessions: { select: { mockLocationDetected: true, clockDriftSeconds: true } },
      },
    });
    const reps = await this.prisma.user.findMany({
      where: { id: { in: repIds } },
      select: { id: true, nameEn: true },
    });
    const nameByRep = new Map(reps.map((r) => [r.id, r.nameEn]));

    const insights: Insight[] = [];

    // 1) Mock-location counts
    const mockByRep = new Map<string, number>();
    for (const v of visits) {
      if (v.sessions.some((s) => s.mockLocationDetected)) {
        mockByRep.set(v.repId, (mockByRep.get(v.repId) ?? 0) + 1);
      }
    }
    for (const [repId, count] of mockByRep) {
      insights.push({
        severity: 'critical',
        text: `${nameByRep.get(repId) ?? repId} has ${count} visit${count > 1 ? 's' : ''} with mock-location flagged this month — review and consider rejecting.`,
        meta: { repId, count },
      });
    }

    // 2) Short dwell counts
    const shortDwellByRep = new Map<string, number>();
    for (const v of visits) {
      if (!v.endedAtServer) continue;
      const dwell = (v.endedAtServer.getTime() - v.startedAtServer.getTime()) / 1000;
      if (dwell < SHORT_DWELL_SECONDS) {
        shortDwellByRep.set(v.repId, (shortDwellByRep.get(v.repId) ?? 0) + 1);
      }
    }
    for (const [repId, count] of shortDwellByRep) {
      if (count < 3) continue;
      insights.push({
        severity: 'warn',
        text: `${nameByRep.get(repId) ?? repId} has ${count} short-dwell visits (< ${SHORT_DWELL_SECONDS}s) this month — possible drive-by logging.`,
        meta: { repId, count },
      });
    }

    // 3) 2-AM rule (spec §6.2): each working day should have ≥ 2 AM accounts
    const visitsByRepDay = new Map<string, Map<string, number>>(); // repId -> { dateISO -> amCount }
    for (const v of visits) {
      if (v.accountType !== 'AM' || !v.isValid) continue;
      const date = v.startedAtServer.toISOString().slice(0, 10);
      if (!visitsByRepDay.has(v.repId)) visitsByRepDay.set(v.repId, new Map());
      const days = visitsByRepDay.get(v.repId)!;
      days.set(date, (days.get(date) ?? 0) + 1);
    }
    for (const repId of repIds) {
      const days = visitsByRepDay.get(repId) ?? new Map<string, number>();
      const missedDays = Array.from(days.entries()).filter(([, c]) => c < 2).length;
      if (missedDays >= 3) {
        insights.push({
          severity: 'warn',
          text: `${nameByRep.get(repId) ?? repId} missed the daily 2-AM rule on ${missedDays} day${missedDays > 1 ? 's' : ''} this month.`,
          meta: { repId, missedDays },
        });
      }
    }

    // 4) Clock drift
    const driftByRep = new Map<string, number>();
    for (const v of visits) {
      const maxDrift = v.sessions.reduce(
        (m, s) => Math.max(m, Math.abs(s.clockDriftSeconds ?? 0)),
        0,
      );
      if (maxDrift > 600) driftByRep.set(v.repId, (driftByRep.get(v.repId) ?? 0) + 1);
    }
    for (const [repId, count] of driftByRep) {
      insights.push({
        severity: count >= 3 ? 'critical' : 'warn',
        text: `${nameByRep.get(repId) ?? repId} has ${count} visit${count > 1 ? 's' : ''} with > 10 min clock drift — possible device tampering.`,
        meta: { repId, count },
      });
    }

    // 5) Bulk pattern at team level
    if (mockByRep.size >= 2) {
      insights.push({
        severity: 'critical',
        text: `${mockByRep.size} reps have mock-location-flagged visits this month — review device fleet for compromised builds.`,
        meta: { repCount: mockByRep.size },
      });
    }

    insights.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
    return insights;
  }
}

function severityRank(s: Insight['severity']): number {
  return s === 'critical' ? 0 : s === 'warn' ? 1 : 2;
}
