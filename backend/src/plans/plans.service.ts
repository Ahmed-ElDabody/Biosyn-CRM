import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  isoWeekOf,
  managerApproveDeadlineUtc,
  planSubmitDeadlineUtc,
} from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import { ListManagerPlansDto } from './dto/list-manager-plans.dto';
import { PlanItemInput, UpsertPlanItemsDto } from './dto/upsert-plan-items.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  // ---------- rep side ----------

  async getOrCreateDraft(repId: string, year: number, isoWeek: number) {
    const existing = await this.prisma.weeklyPlan.findFirst({
      where: { repId, year, isoWeek, deletedAt: null },
      include: { items: { include: { doctor: { select: { id: true, nameAr: true, class: true } } } } },
    });
    return existing ?? null;
  }

  async getCurrent(repId: string) {
    const { year, week } = isoWeekOf(new Date());
    return this.getOrCreateDraft(repId, year, week);
  }

  async getNextWeek(repId: string) {
    const { year, week } = isoWeekOf(new Date());
    // Naive +1 (does not cross year boundary cleanly; spec §8 doesn't require it)
    return this.getOrCreateDraft(repId, year, week + 1);
  }

  async getByWeek(repId: string, year: number, isoWeek: number) {
    return this.getOrCreateDraft(repId, year, isoWeek);
  }

  /**
   * Upserts the rep's plan for (year, isoWeek) and replaces items wholesale.
   * Allowed only when the plan is draft/null AND we're still before the
   * Thursday 23:00 submit deadline.
   */
  async upsertItems(
    repId: string,
    year: number,
    isoWeek: number,
    dto: UpsertPlanItemsDto,
    now: Date = new Date(),
  ) {
    this.assertBeforeSubmitDeadline(year, isoWeek, now);
    await this.assertDoctorsOnRepList(
      repId,
      dto.items.map((i) => i.doctorId),
    );

    return this.prisma.$transaction(async (tx) => {
      let plan = await tx.weeklyPlan.findFirst({
        where: { repId, year, isoWeek, deletedAt: null },
      });
      if (plan && plan.status !== 'draft') {
        throw new BadRequestException(
          `Plan for ${year}-W${isoWeek} is ${plan.status}; create a new draft only allowed when no plan exists yet.`,
        );
      }
      if (!plan) {
        plan = await tx.weeklyPlan.create({
          data: { repId, year, isoWeek, status: 'draft' },
        });
      }
      // Replace items wholesale
      await tx.planItem.deleteMany({ where: { planId: plan.id } });
      if (dto.items.length > 0) {
        await tx.planItem.createMany({
          data: dedupeItems(dto.items).map((i) => ({
            planId: plan!.id,
            doctorId: i.doctorId,
            plannedDay: i.plannedDay,
          })),
        });
      }
      return tx.weeklyPlan.findUnique({
        where: { id: plan.id },
        include: {
          items: { include: { doctor: { select: { id: true, nameAr: true, class: true } } } },
        },
      });
    });
  }

  async submit(repId: string, year: number, isoWeek: number, now: Date = new Date()) {
    this.assertBeforeSubmitDeadline(year, isoWeek, now);
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { repId, year, isoWeek, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('No draft plan for that week');
    if (plan.status !== 'draft') {
      throw new BadRequestException(`Plan is ${plan.status}, cannot submit`);
    }
    const itemCount = await this.prisma.planItem.count({ where: { planId: plan.id } });
    if (itemCount === 0) throw new BadRequestException('Plan has no items; add at least one');
    return this.prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: { status: 'submitted', submittedAt: now },
      include: {
        items: { include: { doctor: { select: { id: true, nameAr: true, class: true } } } },
      },
    });
  }

  async deleteDraft(repId: string, year: number, isoWeek: number) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { repId, year, isoWeek, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('No plan for that week');
    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft plans can be deleted');
    }
    return this.prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------- manager side ----------

  async listForManager(managerId: string, q: ListManagerPlansDto) {
    const reportIds = await this.getReportRepIds(managerId);
    if (reportIds.length === 0) {
      return { items: [], total: 0, page: q.page, pageSize: q.pageSize };
    }
    const where: Prisma.WeeklyPlanWhereInput = {
      repId: { in: reportIds },
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.repId ? { repId: q.repId } : {}),
      ...(q.year !== undefined ? { year: q.year } : {}),
      ...(q.isoWeek !== undefined ? { isoWeek: q.isoWeek } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.weeklyPlan.findMany({
        where,
        include: {
          rep: { select: { id: true, nameEn: true, region: true } },
          items: { include: { doctor: { select: { id: true, nameAr: true, class: true } } } },
        },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.weeklyPlan.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async approve(managerId: string, planId: string, now: Date = new Date()) {
    const plan = await this.requireManagedPlan(managerId, planId);
    if (plan.status !== 'submitted') {
      throw new BadRequestException(`Plan is ${plan.status}, cannot approve`);
    }
    return this.prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: { status: 'approved', approvedAt: now, approvedById: managerId },
    });
  }

  async reject(managerId: string, planId: string, reason: string) {
    const plan = await this.requireManagedPlan(managerId, planId);
    if (plan.status !== 'submitted') {
      throw new BadRequestException(`Plan is ${plan.status}, cannot reject`);
    }
    return this.prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: { status: 'rejected', rejectReason: reason },
    });
  }

  // ---------- helpers ----------

  private assertBeforeSubmitDeadline(year: number, isoWeek: number, now: Date) {
    const deadline = planSubmitDeadlineUtc(year, isoWeek);
    if (now.getTime() > deadline.getTime()) {
      throw new BadRequestException(
        `Submit deadline passed (was ${deadline.toISOString()} UTC) — work in unplanned mode for this week.`,
      );
    }
  }

  /** Public — manager-side reporting uses this to compute deadlines */
  static deadlines(year: number, isoWeek: number) {
    return {
      submitDeadlineUtc: planSubmitDeadlineUtc(year, isoWeek).toISOString(),
      managerApproveDeadlineUtc: managerApproveDeadlineUtc(year, isoWeek).toISOString(),
    };
  }

  private async assertDoctorsOnRepList(repId: string, doctorIds: string[]) {
    if (doctorIds.length === 0) return;
    const unique = Array.from(new Set(doctorIds));
    const onList = await this.prisma.repDoctorList.findMany({
      where: { repId, deletedAt: null, doctorId: { in: unique } },
      select: { doctorId: true },
    });
    const onListSet = new Set(onList.map((r) => r.doctorId));
    const missing = unique.filter((id) => !onListSet.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `These doctor ids are not on your working list: ${missing.join(', ')}`,
      );
    }
  }

  private async getReportRepIds(managerId: string): Promise<string[]> {
    const reps = await this.prisma.user.findMany({
      where: { managerId },
      select: { id: true },
    });
    return reps.map((r) => r.id);
  }

  private async requireManagedPlan(managerId: string, planId: string) {
    const plan = await this.prisma.weeklyPlan.findUnique({
      where: { id: planId },
      include: { rep: { select: { id: true, managerId: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.rep.managerId !== managerId) {
      throw new ForbiddenException('This rep does not report to you');
    }
    return plan;
  }
}

function dedupeItems(items: PlanItemInput[]): PlanItemInput[] {
  const seen = new Set<string>();
  const out: PlanItemInput[] = [];
  for (const i of items) {
    const key = `${i.doctorId}|${i.plannedDay}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}
