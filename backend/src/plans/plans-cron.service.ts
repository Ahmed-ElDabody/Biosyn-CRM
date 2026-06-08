import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { managerApproveDeadlineUtc } from '../common/dates';
import { NOTIFICATION_TYPES } from '../notifications/notification-types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Spec §8 — if the manager hasn't approved the rep's submitted plan by
 * Saturday 10:00 (local), send the CRM admin a notification.
 *
 * Idempotent: each plan is only notified about once
 * (`missedApprovalNotifiedAt` marks it).
 */
@Injectable()
export class PlansCronService {
  private logger = new Logger(PlansCronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkMissedApprovals() {
    await this.run(new Date());
  }

  /** Exposed for manual invocation from an admin endpoint or tests. */
  async run(now: Date) {
    const candidates = await this.prisma.weeklyPlan.findMany({
      where: {
        status: 'submitted',
        missedApprovalNotifiedAt: null,
        deletedAt: null,
      },
      select: { id: true, year: true, isoWeek: true, repId: true, rep: { select: { nameEn: true } } },
    });

    const overdue = candidates.filter(
      (p) => managerApproveDeadlineUtc(p.year, p.isoWeek).getTime() < now.getTime(),
    );
    if (overdue.length === 0) return { checked: candidates.length, notified: 0 };

    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    });
    if (admins.length === 0) {
      this.logger.warn(
        `${overdue.length} overdue plans but no active admins — nothing to notify`,
      );
      return { checked: candidates.length, notified: 0 };
    }

    let notified = 0;
    for (const plan of overdue) {
      await this.notifications.createMany(
        admins.map((a) => a.id),
        NOTIFICATION_TYPES.PLAN_MISSED_APPROVAL,
        `Manager did not approve a plan submitted by ${plan.rep.nameEn} (week ${plan.year}-W${plan.isoWeek}) by the Saturday 10:00 deadline.`,
        { planId: plan.id, repId: plan.repId, year: plan.year, isoWeek: plan.isoWeek },
      );
      await this.prisma.weeklyPlan.update({
        where: { id: plan.id },
        data: { missedApprovalNotifiedAt: now },
      });
      notified++;
    }
    this.logger.log(`Missed-approval cron: notified ${notified} of ${overdue.length} overdue plans.`);
    return { checked: candidates.length, notified };
  }
}
