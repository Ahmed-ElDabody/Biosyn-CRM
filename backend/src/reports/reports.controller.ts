import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { IntegrityScope } from '../integrity/integrity-scope';
import { IntegrityService } from '../integrity/integrity.service';
import { KpiService } from '../kpis/kpi.service';
import { PrismaService } from '../prisma/prisma.service';
import { AmAccountsService } from './am-accounts.service';
import {
  DateRangeReportQueryDto,
  KpisReportQueryDto,
  ReportFormat,
} from './dto/report-query.dto';
import { toCsv } from './exporters/csv';
import { toPdf } from './exporters/pdf';
import { ReportColumn, ReportPayload } from './exporters/report-payload';
import { toXlsx } from './exporters/xlsx';
import { PM_SPAN_MIN_MINUTES, PmHoursService } from './pm-hours.service';
import { VisitIntervalsService } from './visit-intervals.service';

@Controller('reports')
@UseGuards(RolesGuard)
@Roles('manager', 'admin')
export class ReportsController {
  constructor(
    private prisma: PrismaService,
    private scope: IntegrityScope,
    private pmHours: PmHoursService,
    private amAccounts: AmAccountsService,
    private visitIntervals: VisitIntervalsService,
    private integrity: IntegrityService,
    private kpis: KpiService,
  ) {}

  @Get('kpis')
  async kpisReport(
    @CurrentUser() user: AuthUser,
    @Query() q: KpisReportQueryDto,
    @Res() res: Response,
  ) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    const reps = await this.prisma.user.findMany({
      where: { id: { in: repIds } },
      select: { id: true, nameEn: true, region: true },
    });
    const year = q.year ?? new Date().getUTCFullYear();
    const month = q.month ?? new Date().getUTCMonth() + 1;
    const quarter = q.quarter ?? Math.floor(new Date().getUTCMonth() / 3) + 1;
    const rows = await Promise.all(
      reps.map(async (r) => {
        const kpi =
          q.period === 'monthly'
            ? await this.kpis.computeMonthly(r.id, year, month)
            : await this.kpis.computeQuarterly(r.id, year, quarter);
        return {
          repId: r.id,
          repName: r.nameEn,
          region: r.region,
          period: kpi.period.label,
          coverageAch: round1(kpi.coverageAch),
          frequencyAch: round1(kpi.frequencyAch),
          callRateAch: round1(kpi.callRateAch),
          crmScore: round1(kpi.crmScore),
          coverageColor: kpi.coverageColor,
          frequencyColor: kpi.frequencyColor,
          callRateColor: kpi.callRateColor,
          crmColor: kpi.crmColor,
          achieved: kpi.achieved,
        };
      }),
    );

    const columns: ReportColumn[] = [
      { key: 'repName', header: 'Rep' },
      { key: 'region', header: 'Region' },
      { key: 'period', header: 'Period' },
      {
        key: 'coverageAch',
        header: 'Coverage %',
        color: (row) => row.coverageColor as 'red' | 'gold' | 'green' | null,
      },
      {
        key: 'frequencyAch',
        header: 'Frequency %',
        color: (row) => row.frequencyColor as 'red' | 'gold' | 'green' | null,
      },
      {
        key: 'callRateAch',
        header: 'Call Rate %',
        color: (row) => row.callRateColor as 'red' | 'gold' | 'green' | null,
      },
      {
        key: 'crmScore',
        header: 'CRM Score',
        color: (row) => row.crmColor as 'red' | 'gold' | 'green' | null,
      },
      { key: 'achieved', header: 'Achieved (≥90%)' },
    ];

    return this.send(res, q.format ?? ReportFormat.json, {
      title: `KPIs — ${q.period}`,
      subtitle:
        q.period === 'monthly' ? `${year}-${String(month).padStart(2, '0')}` : `${year}-Q${quarter}`,
      generatedAt: new Date(),
      columns,
      rows,
    });
  }

  @Get('pm-hours')
  async pmHoursReport(
    @CurrentUser() user: AuthUser,
    @Query() q: DateRangeReportQueryDto,
    @Res() res: Response,
  ) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    const rows = await this.pmHours.report(repIds, new Date(q.from), new Date(q.to));

    const columns: ReportColumn[] = [
      { key: 'date', header: 'Date' },
      { key: 'repName', header: 'Rep' },
      { key: 'firstPmStart', header: 'First PM start' },
      { key: 'lastPmEnd', header: 'Last PM end' },
      {
        key: 'spanMinutes',
        header: `Span (min, target ${PM_SPAN_MIN_MINUTES})`,
        color: (row) => ((row.spanMinutes as number) < PM_SPAN_MIN_MINUTES ? 'red' : 'green'),
      },
      { key: 'visitCount', header: 'Visit count' },
    ];
    return this.send(res, q.format ?? ReportFormat.json, {
      title: 'Total PM Working Hours',
      subtitle: `${q.from} → ${q.to}`,
      generatedAt: new Date(),
      columns,
      rows: rows as unknown as Record<string, unknown>[],
    });
  }

  @Get('am-accounts')
  async amAccountsReport(
    @CurrentUser() user: AuthUser,
    @Query() q: DateRangeReportQueryDto,
    @Res() res: Response,
  ) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    const rows = await this.amAccounts.report(repIds, new Date(q.from), new Date(q.to));

    const columns: ReportColumn[] = [
      { key: 'date', header: 'Date (local)' },
      { key: 'repName', header: 'Rep' },
      {
        key: 'amCount',
        header: 'AM count (target ≥ 2)',
        color: (row) => ((row.amCount as number) < 2 ? 'red' : 'green'),
      },
      {
        key: 'firstAmLocalHour',
        header: 'First AM (local hour)',
        color: (row) => (row.firstAmLate ? 'gold' : null),
      },
      { key: 'firstAmLate', header: 'First AM ≥ 11:00 (flag)' },
    ];

    return this.send(res, q.format ?? ReportFormat.json, {
      title: 'AM Accounts',
      subtitle: `${q.from} → ${q.to}`,
      generatedAt: new Date(),
      columns,
      rows: rows as unknown as Record<string, unknown>[],
    });
  }

  @Get('visit-intervals')
  async visitIntervalsReport(
    @CurrentUser() user: AuthUser,
    @Query() q: DateRangeReportQueryDto,
    @Res() res: Response,
  ) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    const rows = await this.visitIntervals.report(repIds, new Date(q.from), new Date(q.to));

    const columns: ReportColumn[] = [
      { key: 'date', header: 'Date' },
      { key: 'repName', header: 'Rep' },
      { key: 'fromAccountType', header: 'From AM/PM' },
      { key: 'toAccountType', header: 'To AM/PM' },
      { key: 'fromEndedAt', header: 'Previous end' },
      { key: 'toStartedAt', header: 'Next start' },
      {
        key: 'intervalMinutes',
        header: 'Interval (min, target ≥ 10)',
        color: (row) => ((row.intervalMinutes as number) < 10 ? 'red' : 'green'),
      },
    ];
    return this.send(res, q.format ?? ReportFormat.json, {
      title: 'Visit Intervals',
      subtitle: `${q.from} → ${q.to}`,
      generatedAt: new Date(),
      columns,
      rows: rows.map((r) => ({
        ...r,
        intervalMinutes: round1(r.intervalMinutes),
      })),
    });
  }

  @Get('integrity')
  async integrityReport(
    @CurrentUser() user: AuthUser,
    @Query() q: DateRangeReportQueryDto,
    @Res() res: Response,
  ) {
    const repIds = await this.scope.resolveRepIds(user, q.repId);
    const window = { repIds, from: new Date(q.from), to: new Date(q.to) };
    const [mock, drift, lag, sameLoc, shortDwell] = await Promise.all([
      this.integrity.mockGpsReport(window),
      this.integrity.clockDriftReport(window),
      this.integrity.offlineLagReport(window),
      this.integrity.sameLocationReport(window),
      this.integrity.shortDwellReport(window),
    ]);
    const rows = [
      { category: 'Mock GPS', count: mock.length },
      { category: 'Clock drift > 10 min', count: drift.length },
      { category: 'Offline lag > 24 h', count: lag.length },
      { category: 'Same-location clusters', count: sameLoc.length },
      { category: 'Short dwell (< 60 s)', count: shortDwell.length },
    ];
    const columns: ReportColumn[] = [
      { key: 'category', header: 'Category' },
      {
        key: 'count',
        header: 'Count',
        color: (row) =>
          (row.count as number) === 0 ? 'green' : (row.count as number) < 5 ? 'gold' : 'red',
      },
    ];
    return this.send(res, q.format ?? ReportFormat.json, {
      title: 'Integrity / Anti-Gaming Summary',
      subtitle: `${q.from} → ${q.to}`,
      generatedAt: new Date(),
      columns,
      rows,
    });
  }

  // ---------- format dispatch ----------

  private async send(res: Response, format: ReportFormat, payload: ReportPayload) {
    const safeName = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    switch (format) {
      case ReportFormat.csv: {
        const csv = toCsv(payload);
        res
          .setHeader('Content-Type', 'text/csv; charset=utf-8')
          .setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`)
          .send(csv);
        return;
      }
      case ReportFormat.xlsx: {
        const buf = await toXlsx(payload);
        res
          .setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          )
          .setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`)
          .send(buf);
        return;
      }
      case ReportFormat.pdf: {
        const buf = await toPdf(payload);
        res
          .setHeader('Content-Type', 'application/pdf')
          .setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`)
          .send(buf);
        return;
      }
      case ReportFormat.json:
      default:
        res.json(payload);
        return;
    }
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
