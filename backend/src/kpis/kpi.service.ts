import { Injectable } from '@nestjs/common';
import { DoctorClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Spec §4 — monthly targets
export const MONTHLY_FREQUENCY_TARGET: Record<DoctorClass, number> = {
  A: 3,
  B: 2,
  C: 1,
};
export const MONTHLY_CALL_RATE_TARGET = 180;

// Spec §5 — quarterly targets (deliberately NOT ×3 of monthly)
export const QUARTERLY_FREQUENCY_TARGET: Record<DoctorClass, number> = {
  A: 7,
  B: 5,
  C: 3,
};
export const QUARTERLY_CALL_RATE_TARGET = 500;

// Spec §4.4 — CRM cutoff
export const CRM_ACHIEVEMENT_CUTOFF = 90;

// Spec §4.5 — achievement coloring
export type AchievementColor = 'green' | 'gold' | 'red';
export function achievementColor(pct: number): AchievementColor {
  if (pct >= 100) return 'green';
  if (pct >= 90) return 'gold';
  return 'red';
}

export interface KpiResult {
  period: { label: string; from: Date; to: Date };
  totalDoctors: number;
  frequencyTarget: number;
  callRateTarget: number;
  coverageAch: number;
  coverageColor: AchievementColor;
  frequencyAch: number;
  frequencyColor: AchievementColor;
  callRateAch: number;
  callRateColor: AchievementColor;
  crmScore: number;
  crmColor: AchievementColor;
  achieved: boolean;
  cutoff: number;
}

@Injectable()
export class KpiService {
  constructor(private prisma: PrismaService) {}

  // ---------- monthly ----------

  async computeMonthly(repId: string, year: number, month: number /* 1..12 */): Promise<KpiResult> {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    return this.compute(repId, MONTHLY_FREQUENCY_TARGET, MONTHLY_CALL_RATE_TARGET, from, to, {
      label: `${year}-${String(month).padStart(2, '0')}`,
      coverageMode: 'distinct_doctors_visited',
    });
  }

  // ---------- quarterly ----------

  async computeQuarterly(repId: string, year: number, quarter: number /* 1..4 */): Promise<KpiResult> {
    const startMonth = (quarter - 1) * 3; // 0,3,6,9
    const from = new Date(Date.UTC(year, startMonth, 1));
    const to = new Date(Date.UTC(year, startMonth + 3, 1));
    return this.compute(repId, QUARTERLY_FREQUENCY_TARGET, QUARTERLY_CALL_RATE_TARGET, from, to, {
      label: `${year}-Q${quarter}`,
      coverageMode: 'doctors_with_visits_in_each_month',
    });
  }

  // ---------- shared compute ----------

  private async compute(
    repId: string,
    targetByClass: Record<DoctorClass, number>,
    callRateTarget: number,
    from: Date,
    to: Date,
    opts: {
      label: string;
      coverageMode: 'distinct_doctors_visited' | 'doctors_with_visits_in_each_month';
    },
  ): Promise<KpiResult> {
    const list = await this.prisma.repDoctorList.findMany({
      where: { repId, deletedAt: null, status: 'active' },
      select: { doctorId: true, doctor: { select: { class: true } } },
    });
    const totalDoctors = list.length;
    const frequencyTarget = list.reduce(
      (acc, r) => acc + targetByClass[r.doctor.class],
      0,
    );

    // Valid visits in the window — used for both frequency and coverage
    const validVisits = await this.prisma.visit.findMany({
      where: {
        repId,
        isValid: true,
        startedAtServer: { gte: from, lt: to },
      },
      select: { doctorId: true, startedAtServer: true },
    });

    // Coverage
    let coverageNumerator = 0;
    if (opts.coverageMode === 'distinct_doctors_visited') {
      coverageNumerator = new Set(validVisits.map((v) => v.doctorId)).size;
    } else {
      // Quarter: doctor must have ≥1 valid visit in EACH month of the quarter
      const monthsByDoctor = new Map<string, Set<number>>();
      for (const v of validVisits) {
        const ym = v.startedAtServer.getUTCMonth();
        if (!monthsByDoctor.has(v.doctorId)) monthsByDoctor.set(v.doctorId, new Set());
        monthsByDoctor.get(v.doctorId)!.add(ym);
      }
      coverageNumerator = Array.from(monthsByDoctor.values()).filter((s) => s.size === 3).length;
    }
    const coverageAch =
      totalDoctors === 0 ? 0 : Math.min(100, (coverageNumerator / totalDoctors) * 100);

    // Frequency — uncapped
    const frequencyAch =
      frequencyTarget === 0 ? 0 : (validVisits.length / frequencyTarget) * 100;

    // Call rate — all visits (not just valid), uncapped
    const allVisits = await this.prisma.visit.count({
      where: { repId, startedAtServer: { gte: from, lt: to } },
    });
    const callRateAch = (allVisits / callRateTarget) * 100;

    const crmScore = (coverageAch + callRateAch + frequencyAch) / 3;
    return {
      period: { label: opts.label, from, to },
      totalDoctors,
      frequencyTarget,
      callRateTarget,
      coverageAch,
      coverageColor: achievementColor(coverageAch),
      frequencyAch,
      frequencyColor: achievementColor(frequencyAch),
      callRateAch,
      callRateColor: achievementColor(callRateAch),
      crmScore,
      crmColor: achievementColor(crmScore),
      achieved: crmScore >= CRM_ACHIEVEMENT_CUTOFF,
      cutoff: CRM_ACHIEVEMENT_CUTOFF,
    };
  }

  // ---------- batch ----------

  async computeMonthlyForReps(repIds: string[], year: number, month: number) {
    return Promise.all(
      repIds.map(async (repId) => ({ repId, kpi: await this.computeMonthly(repId, year, month) })),
    );
  }

  async computeQuarterlyForReps(repIds: string[], year: number, quarter: number) {
    return Promise.all(
      repIds.map(async (repId) => ({ repId, kpi: await this.computeQuarterly(repId, year, quarter) })),
    );
  }

  // ---------- persistence ----------

  /**
   * Persist a precomputed snapshot row per rep (spec §3 — kpi_snapshots is
   * the "optional, for fast reporting" path). Idempotent on (repId, period).
   */
  async persistSnapshot(repId: string, kpi: KpiResult) {
    return this.prisma.kpiSnapshot.upsert({
      where: { repId_period: { repId, period: kpi.period.label } },
      update: {
        coverageAch: kpi.coverageAch,
        callRateAch: kpi.callRateAch,
        frequencyAch: kpi.frequencyAch,
        crmScore: kpi.crmScore,
      },
      create: {
        repId,
        period: kpi.period.label,
        coverageAch: kpi.coverageAch,
        callRateAch: kpi.callRateAch,
        frequencyAch: kpi.frequencyAch,
        crmScore: kpi.crmScore,
      },
    });
  }
}
