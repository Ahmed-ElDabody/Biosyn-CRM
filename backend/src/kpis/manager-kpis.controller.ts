import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { KpiQueryDto, KpiPeriod, resolvePeriod } from './dto/kpi-query.dto';
import { KpiService } from './kpi.service';

@Controller('manager/kpis')
@UseGuards(RolesGuard)
@Roles('manager', 'admin')
export class ManagerKpisController {
  constructor(
    private kpis: KpiService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() q: KpiQueryDto) {
    const reps = await this.prisma.user.findMany({
      where: { managerId: user.id, role: 'rep' },
      select: { id: true, nameEn: true, region: true },
    });
    const p = resolvePeriod(q);
    const rows = await Promise.all(
      reps.map(async (r) => ({
        rep: r,
        kpi:
          p.kind === 'monthly'
            ? await this.kpis.computeMonthly(r.id, p.year, p.month)
            : await this.kpis.computeQuarterly(r.id, p.year, p.quarter),
      })),
    );
    return { period: rows[0]?.kpi.period.label ?? p, items: rows };
  }
}
