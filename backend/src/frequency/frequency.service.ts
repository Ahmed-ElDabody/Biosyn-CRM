import { Injectable } from '@nestjs/common';
import { DoctorClass } from '@prisma/client';
import { startOfMonth, startOfNextMonth } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';

// Section 4.2: target visits per doctor per month by class.
export const MONTHLY_FREQUENCY_TARGET: Record<DoctorClass, number> = {
  A: 3,
  B: 2,
  C: 1,
};

export type FrequencyState = 'todo' | 'in_progress' | 'done' | 'over';

export interface DoctorFrequency {
  doctorId: string;
  class: DoctorClass;
  target: number;
  actual: number;
  remaining: number; // 0 once target met
  overBy: number; // 0 unless actual > target
  progressPct: number; // 0..100+ (uncapped — spec allows over-achievement)
  state: FrequencyState;
}

@Injectable()
export class FrequencyService {
  constructor(private prisma: PrismaService) {}

  /**
   * For a rep + a list of doctor ids, compute monthly visit counts and
   * map to a frequency-bar state. Only `is_valid=true` visits count
   * toward frequency (Section 9.2 — invalid visits are excluded).
   */
  async forRepDoctors(
    repId: string,
    doctorClassByDoctorId: Map<string, DoctorClass>,
    when: Date = new Date(),
  ): Promise<Map<string, DoctorFrequency>> {
    const doctorIds = Array.from(doctorClassByDoctorId.keys());
    const result = new Map<string, DoctorFrequency>();
    if (doctorIds.length === 0) return result;

    const from = startOfMonth(when);
    const to = startOfNextMonth(when);

    const grouped = await this.prisma.visit.groupBy({
      by: ['doctorId'],
      where: {
        repId,
        doctorId: { in: doctorIds },
        isValid: true,
        startedAtServer: { gte: from, lt: to },
      },
      _count: { _all: true },
    });

    const counts = new Map<string, number>();
    for (const g of grouped) counts.set(g.doctorId, g._count._all);

    for (const [doctorId, cls] of doctorClassByDoctorId) {
      const actual = counts.get(doctorId) ?? 0;
      const target = MONTHLY_FREQUENCY_TARGET[cls];
      const overBy = Math.max(0, actual - target);
      const remaining = Math.max(0, target - actual);
      const progressPct = target > 0 ? (actual / target) * 100 : 0;
      let state: FrequencyState;
      if (actual === 0) state = 'todo';
      else if (actual < target) state = 'in_progress';
      else if (actual === target) state = 'done';
      else state = 'over';

      result.set(doctorId, {
        doctorId,
        class: cls,
        target,
        actual,
        remaining,
        overBy,
        progressPct,
        state,
      });
    }
    return result;
  }
}
