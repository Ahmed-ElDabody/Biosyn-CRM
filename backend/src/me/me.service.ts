import { Injectable, NotFoundException } from '@nestjs/common';
import { DoctorClass, Prisma } from '@prisma/client';
import { startOfMonth, startOfNextMonth } from '../common/dates';
import { FrequencyService, MONTHLY_FREQUENCY_TARGET } from '../frequency/frequency.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListMyDoctorsDto } from './dto/list-me-doctors.dto';

// Spec §4.3 — monthly call-rate target is 180 visits.
const MONTHLY_CALL_RATE_TARGET = 180;
// Spec §4.4 — CRM achievement cutoff is 90%.
const CRM_ACHIEVEMENT_CUTOFF = 90;

@Injectable()
export class MeService {
  constructor(
    private prisma: PrismaService,
    private freq: FrequencyService,
  ) {}

  async listDoctors(repId: string, q: ListMyDoctorsDto) {
    const where: Prisma.RepDoctorListWhereInput = {
      repId,
      deletedAt: null,
      ...(q.listStatus ? { status: q.listStatus } : {}),
      doctor: {
        deletedAt: null,
        ...(q.class ? { class: q.class } : {}),
        ...(q.accountType ? { accountType: q.accountType } : {}),
        ...(q.q
          ? {
              OR: [{ nameAr: { contains: q.q } }, { addressAr: { contains: q.q } }],
            }
          : {}),
      },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.repDoctorList.findMany({
        where,
        include: { doctor: true },
        orderBy: [{ doctor: { class: 'asc' } }, { doctor: { nameAr: 'asc' } }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.repDoctorList.count({ where }),
    ]);

    const classMap = new Map<string, DoctorClass>();
    for (const r of rows) classMap.set(r.doctorId, r.doctor.class);
    const freqByDoctor = await this.freq.forRepDoctors(repId, classMap);

    const items = rows.map((r) => ({
      listEntryId: r.id,
      listStatus: r.status,
      addedAt: r.addedAt,
      doctor: r.doctor,
      frequency: freqByDoctor.get(r.doctorId)!,
    }));

    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async getDoctorDetail(repId: string, doctorId: string) {
    const entry = await this.prisma.repDoctorList.findFirst({
      where: { repId, doctorId, deletedAt: null },
      include: { doctor: true },
    });
    if (!entry) throw new NotFoundException('Doctor is not on your list');

    const classMap = new Map<string, DoctorClass>([[doctorId, entry.doctor.class]]);
    const freq = (await this.freq.forRepDoctors(repId, classMap)).get(doctorId)!;

    const from = startOfMonth(new Date());
    const to = startOfNextMonth(new Date());
    const recentVisits = await this.prisma.visit.findMany({
      where: { repId, doctorId, startedAtServer: { gte: from, lt: to } },
      orderBy: { startedAtServer: 'desc' },
      take: 20,
      select: {
        id: true,
        startedAtServer: true,
        endedAtServer: true,
        isValid: true,
        geofenceOk: true,
        accountType: true,
      },
    });

    return {
      listEntryId: entry.id,
      listStatus: entry.status,
      addedAt: entry.addedAt,
      doctor: entry.doctor,
      frequency: freq,
      recentVisits,
    };
  }

  /**
   * Section 4 monthly KPI summary for the calling rep.
   * - coverage_ach (capped at 100%)
   * - frequency_ach (uncapped)
   * - call_rate_ach (uncapped)
   * - crm_score = avg(coverage, call_rate, frequency)
   */
  async kpiSummary(repId: string) {
    const from = startOfMonth(new Date());
    const to = startOfNextMonth(new Date());

    const list = await this.prisma.repDoctorList.findMany({
      where: { repId, deletedAt: null, status: 'active' },
      select: { doctorId: true, doctor: { select: { class: true } } },
    });

    const targetByClass = list.reduce(
      (acc, r) => acc + MONTHLY_FREQUENCY_TARGET[r.doctor.class],
      0,
    );
    const totalDoctors = list.length;

    // Visits this month, valid only, scoped to the rep
    const monthlyValid = await this.prisma.visit.findMany({
      where: {
        repId,
        isValid: true,
        startedAtServer: { gte: from, lt: to },
      },
      select: { doctorId: true },
    });

    const distinctDoctorsVisited = new Set(monthlyValid.map((v) => v.doctorId)).size;
    const coverageAch = totalDoctors === 0 ? 0 : Math.min(100, (distinctDoctorsVisited / totalDoctors) * 100);
    const frequencyAch = targetByClass === 0 ? 0 : (monthlyValid.length / targetByClass) * 100;

    const allVisitsThisMonth = await this.prisma.visit.count({
      where: { repId, startedAtServer: { gte: from, lt: to } },
    });
    const callRateAch = (allVisitsThisMonth / MONTHLY_CALL_RATE_TARGET) * 100;
    const crmScore = (coverageAch + callRateAch + frequencyAch) / 3;

    return {
      period: { from, to },
      totalDoctors,
      frequencyTarget: targetByClass,
      callRateTarget: MONTHLY_CALL_RATE_TARGET,
      coverageAch,
      frequencyAch,
      callRateAch,
      crmScore,
      achieved: crmScore >= CRM_ACHIEVEMENT_CUTOFF,
      cutoff: CRM_ACHIEVEMENT_CUTOFF,
    };
  }
}
