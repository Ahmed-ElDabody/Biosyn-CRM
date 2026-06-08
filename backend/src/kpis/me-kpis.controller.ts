import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { KpiQueryDto, resolvePeriod } from './dto/kpi-query.dto';
import { KpiService } from './kpi.service';

@Controller('me/kpis')
export class MeKpisController {
  constructor(private kpis: KpiService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    const now = new Date();
    return this.kpis.computeMonthly(user.id, now.getUTCFullYear(), now.getUTCMonth() + 1);
  }

  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser, @Query() q: KpiQueryDto) {
    const p = resolvePeriod({ ...q, period: 'monthly' as KpiQueryDto['period'] });
    if (p.kind !== 'monthly') throw new Error('unreachable');
    return this.kpis.computeMonthly(user.id, p.year, p.month);
  }

  @Get('quarterly')
  quarterly(@CurrentUser() user: AuthUser, @Query() q: KpiQueryDto) {
    const p = resolvePeriod({ ...q, period: 'quarterly' as KpiQueryDto['period'] });
    if (p.kind !== 'quarterly') throw new Error('unreachable');
    return this.kpis.computeQuarterly(user.id, p.year, p.quarter);
  }
}
