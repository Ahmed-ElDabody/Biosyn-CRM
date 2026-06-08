import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Records sensitive actions for forensic review. Best-effort: failures here
 * MUST NOT block the caller, so write errors are logged and swallowed.
 */
@Injectable()
export class AuditService {
  private logger = new Logger(AuditService.name);
  constructor(private prisma: PrismaService) {}

  async record(
    actorId: string | null,
    action: string,
    target?: { type: string; id: string },
    meta?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          targetType: target?.type,
          targetId: target?.id,
          meta: meta as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`audit_log write failed: ${(err as Error).message}`);
    }
  }
}
