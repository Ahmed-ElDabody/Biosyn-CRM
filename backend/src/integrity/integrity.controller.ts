import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { InsightsDto, IntegrityWindowDto, RouteReplayDto } from './dto/integrity-query.dto';
import { InsightsService } from './insights.service';
import { IntegrityScope } from './integrity-scope';
import { IntegrityService } from './integrity.service';
import { RouteReplayService } from './route-replay.service';

@Controller('integrity')
@UseGuards(RolesGuard)
@Roles('manager', 'admin')
export class IntegrityController {
  constructor(
    private scope: IntegrityScope,
    private integrity: IntegrityService,
    private route: RouteReplayService,
    private insights: InsightsService,
  ) {}

  @Get('mock-gps')
  async mockGps(@CurrentUser() user: AuthUser, @Query() q: IntegrityWindowDto) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    return this.integrity.mockGpsReport({
      repIds,
      from: new Date(q.from),
      to: new Date(q.to),
    });
  }

  @Get('clock-drift')
  async clockDrift(@CurrentUser() user: AuthUser, @Query() q: IntegrityWindowDto) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    return this.integrity.clockDriftReport({
      repIds,
      from: new Date(q.from),
      to: new Date(q.to),
    });
  }

  @Get('offline-lag')
  async offlineLag(@CurrentUser() user: AuthUser, @Query() q: IntegrityWindowDto) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    return this.integrity.offlineLagReport({
      repIds,
      from: new Date(q.from),
      to: new Date(q.to),
    });
  }

  @Get('same-location')
  async sameLocation(@CurrentUser() user: AuthUser, @Query() q: IntegrityWindowDto) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    return this.integrity.sameLocationReport({
      repIds,
      from: new Date(q.from),
      to: new Date(q.to),
    });
  }

  @Get('short-dwell')
  async shortDwell(@CurrentUser() user: AuthUser, @Query() q: IntegrityWindowDto) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    return this.integrity.shortDwellReport({
      repIds,
      from: new Date(q.from),
      to: new Date(q.to),
    });
  }

  @Get('route')
  async dayRoute(@CurrentUser() user: AuthUser, @Query() q: RouteReplayDto) {
    await this.scope.resolveRepIds(user, q.repId); // permission check; throws if not allowed
    return this.route.dayRoute(q.repId, new Date(q.date));
  }

  @Get('insights')
  async insightsFeed(@CurrentUser() user: AuthUser, @Query() q: InsightsDto) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    const asOf = q.asOf ? new Date(q.asOf) : new Date();
    return this.insights.generate(repIds, asOf);
  }
}
