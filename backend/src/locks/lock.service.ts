import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_TZ_OFFSET_MIN } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';

// Spec §7.2 — global window opens days 15-30 (inclusive) of each quarter-end
// month: March, June, September, December. Local time per TZ_OFFSET_MINUTES.
const QUARTER_END_MONTHS = [3, 6, 9, 12] as const;
const WINDOW_START_DAY = 15;
const WINDOW_END_DAY = 30;

export interface LockStatus {
  locked: boolean;
  source: 'global_window' | 'per_rep_override' | 'locked';
  windowOpensAt?: string;
  windowClosesAt?: string;
  reason?: string;
}

@Injectable()
export class LockService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Decide whether a rep's list is editable RIGHT NOW.
   * - Returns `locked: false` if either the global quarter-end window is open
   *   OR an active per-rep ListLock exists.
   * - Otherwise `locked: true` plus the next opening time.
   */
  async statusFor(repId: string, now: Date = new Date()): Promise<LockStatus> {
    // Check per-rep override first (admin-granted)
    const override = await this.prisma.listLock.findFirst({
      where: {
        scope: 'per_rep',
        repId,
        opensAt: { lte: now },
        closesAt: { gt: now },
      },
      orderBy: { closesAt: 'desc' },
    });
    if (override) {
      return {
        locked: false,
        source: 'per_rep_override',
        windowOpensAt: override.opensAt.toISOString(),
        windowClosesAt: override.closesAt.toISOString(),
        reason: override.reason ?? undefined,
      };
    }

    const window = this.currentOrNextGlobalWindow(now);
    if (window.openNow) {
      return {
        locked: false,
        source: 'global_window',
        windowOpensAt: window.opensAt.toISOString(),
        windowClosesAt: window.closesAt.toISOString(),
      };
    }
    return {
      locked: true,
      source: 'locked',
      windowOpensAt: window.opensAt.toISOString(),
      windowClosesAt: window.closesAt.toISOString(),
    };
  }

  /**
   * Compute either the currently-open or the next-upcoming global window.
   * Window endpoints are anchored to local midnight (day 15 00:00 ... day 30 23:59:59.999)
   * then converted to UTC via the configured TZ offset.
   */
  currentOrNextGlobalWindow(now: Date): {
    openNow: boolean;
    opensAt: Date;
    closesAt: Date;
  } {
    const tzMs = DEFAULT_TZ_OFFSET_MIN * 60_000;
    const localNow = new Date(now.getTime() + tzMs);
    const y = localNow.getUTCFullYear();

    // Build candidate windows for this year + spillover into next year
    const candidates: { opensAt: Date; closesAt: Date }[] = [];
    for (const yr of [y, y + 1]) {
      for (const m of QUARTER_END_MONTHS) {
        const opensLocal = Date.UTC(yr, m - 1, WINDOW_START_DAY, 0, 0, 0, 0);
        const closesLocal = Date.UTC(yr, m - 1, WINDOW_END_DAY, 23, 59, 59, 999);
        candidates.push({
          opensAt: new Date(opensLocal - tzMs),
          closesAt: new Date(closesLocal - tzMs),
        });
      }
    }

    // Current
    for (const w of candidates) {
      if (now >= w.opensAt && now <= w.closesAt) {
        return { openNow: true, ...w };
      }
    }
    // Next upcoming
    const next = candidates.find((w) => w.opensAt > now)!;
    return { openNow: false, ...next };
  }

  async listAllOverrides() {
    return this.prisma.listLock.findMany({
      orderBy: [{ closesAt: 'desc' }],
      include: { rep: { select: { id: true, nameEn: true } } },
    });
  }

  async createOverride(
    grantedByAdminId: string,
    repId: string,
    opensAt: Date,
    closesAt: Date,
    reason?: string,
  ) {
    const lock = await this.prisma.listLock.create({
      data: {
        scope: 'per_rep',
        repId,
        opensAt,
        closesAt,
        reason,
        grantedById: grantedByAdminId,
      },
    });
    await this.audit.record(
      grantedByAdminId,
      'list_lock.override_created',
      { type: 'list_lock', id: lock.id },
      { repId, opensAt, closesAt, reason },
    );
    return lock;
  }

  async revokeOverride(id: string, adminId?: string) {
    const lock = await this.prisma.listLock.delete({ where: { id } });
    await this.audit.record(adminId ?? null, 'list_lock.override_revoked', {
      type: 'list_lock',
      id,
    }, { repId: lock.repId });
    return lock;
  }
}

export { Prisma };
