import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { CreateVisitDto } from '../visits/dto/create-visit.dto';
import { VisitsService } from '../visits/visits.service';
import { SyncPushDto, SyncPushResult } from './dto/sync-push.dto';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(
    private sync: SyncService,
    private visits: VisitsService,
  ) {}

  /** Pull-side bootstrap for the offline rep app. */
  @Get('snapshot')
  snapshot(@CurrentUser() user: AuthUser) {
    return this.sync.snapshot(user.id);
  }

  /**
   * Push side: batched offline visit submissions. Each visit is processed
   * independently — a failure on one item does NOT fail the batch. Idempotent
   * via per-visit clientId (matches VisitsService.createForRep behavior).
   */
  @Post('push')
  async push(
    @CurrentUser() user: AuthUser,
    @Body() dto: SyncPushDto,
  ): Promise<{ results: SyncPushResult[] }> {
    const results: SyncPushResult[] = [];
    for (const v of dto.visits) {
      try {
        const created = await this.visits.createForRep(user.id, v as CreateVisitDto);
        const idempotent = (created as { idempotent?: boolean }).idempotent === true;
        results.push({
          clientId: v.clientId ?? null,
          status: idempotent ? 'idempotent' : 'ok',
          visitId: created.id,
        });
      } catch (err) {
        results.push({
          clientId: v.clientId ?? null,
          status: 'error',
          error: (err as Error).message,
        });
      }
    }
    return { results };
  }
}
