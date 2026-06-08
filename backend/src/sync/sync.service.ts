import { Injectable } from '@nestjs/common';
import { DoctorClass } from '@prisma/client';
import { isoWeekOf } from '../common/dates';
import { FrequencyService, MONTHLY_FREQUENCY_TARGET } from '../frequency/frequency.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private freq: FrequencyService,
  ) {}

  /**
   * Bootstraps the rep's offline DB: everything the tablet needs to
   * operate without a connection. Server time is included so the device
   * can compute clock-drift on its end (spec §10.2).
   */
  async snapshot(repId: string) {
    const now = new Date();
    const { year, week } = isoWeekOf(now);

    const [rep, repListRows, bricks, products] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: repId },
        select: {
          id: true,
          nameEn: true,
          email: true,
          role: true,
          region: true,
          managerId: true,
        },
      }),
      this.prisma.repDoctorList.findMany({
        where: { repId, deletedAt: null },
        include: { doctor: true },
      }),
      this.prisma.brick.findMany({
        include: { subBricks: { select: { id: true, nameEn: true } } },
        orderBy: { nameEn: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const classMap = new Map<string, DoctorClass>();
    for (const r of repListRows) classMap.set(r.doctorId, r.doctor.class);
    const freqByDoctor = await this.freq.forRepDoctors(repId, classMap, now);

    const myDoctors = repListRows.map((r) => ({
      listEntryId: r.id,
      listStatus: r.status,
      addedAt: r.addedAt,
      doctor: r.doctor,
      frequency: freqByDoctor.get(r.doctorId)!,
    }));

    const currentWeekPlan = await this.prisma.weeklyPlan.findFirst({
      where: { repId, year, isoWeek: week, deletedAt: null },
      include: {
        items: {
          include: { doctor: { select: { id: true, nameAr: true, class: true } } },
        },
      },
    });

    return {
      serverTime: now.toISOString(),
      isoWeek: { year, week },
      rep,
      config: {
        monthlyFrequencyTargetByClass: MONTHLY_FREQUENCY_TARGET,
        monthlyCallRateTarget: 180,
        geofence: { amMeters: 150, pmMeters: 100 },
        validVisit: { minSlides: 5, minDurationSeconds: 30 },
        pmRules: { minSpanMinutes: 150, minIntervalMinutes: 10 },
        amRules: { firstVisitBeforeHour: 11, dailyTarget: 2 },
      },
      myDoctors,
      bricks,
      products,
      currentWeekPlan,
    };
  }
}
