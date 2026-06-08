import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { KpiQueryDto, resolvePeriod } from './dto/kpi-query.dto';
import { KpiService } from './kpi.service';

@Controller('admin/kpis')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminKpisController {
  constructor(
    private kpis: KpiService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async list(@Query() q: KpiQueryDto) {
    const reps = await this.prisma.user.findMany({
      where: { role: 'rep', isActive: true, ...(q.repId ? { id: q.repId } : {}) },
      select: { id: true, nameEn: true, region: true, managerId: true },
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

  /**
   * Trigger snapshot persistence for ALL reps for the requested period.
   * Designed to be called by a future cron (e.g. nightly during last 3 days
   * of a month) — kept manual for now.
   */
  @Post('snapshot')
  @HttpCode(200)
  async snapshot(@Body() q: KpiQueryDto) {
    const reps = await this.prisma.user.findMany({
      where: { role: 'rep' },
      select: { id: true },
    });
    const p = resolvePeriod(q);
    let count = 0;
    for (const r of reps) {
      const kpi =
        p.kind === 'monthly'
          ? await this.kpis.computeMonthly(r.id, p.year, p.month)
          : await this.kpis.computeQuarterly(r.id, p.year, p.quarter);
      await this.kpis.persistSnapshot(r.id, kpi);
      count++;
    }
    return { period: p, repsSnapshotted: count };
  }
}
