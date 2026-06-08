import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Decides which rep ids a caller can see in integrity reports:
 * - admin: all reps
 * - manager: direct reports only
 * - rep: forbidden (integrity reports are management-facing)
 */
@Injectable()
export class IntegrityScope {
  constructor(private prisma: PrismaService) {}

  async resolveRepIds(user: AuthUser, requestedRepId?: string): Promise<string[]> {
    if (user.role === ('admin' as Role)) {
      if (requestedRepId) return [requestedRepId];
      const reps = await this.prisma.user.findMany({
        where: { role: 'rep', isActive: true },
        select: { id: true },
      });
      return reps.map((r) => r.id);
    }
    if (user.role === ('manager' as Role)) {
      const reps = await this.prisma.user.findMany({
        where: { managerId: user.id, role: 'rep' },
        select: { id: true },
      });
      const ids = reps.map((r) => r.id);
      if (requestedRepId) {
        if (!ids.includes(requestedRepId)) {
          throw new ForbiddenException('That rep does not report to you');
        }
        return [requestedRepId];
      }
      return ids;
    }
    throw new ForbiddenException('Integrity reports are not available to reps');
  }
}
