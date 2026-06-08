import { Module } from '@nestjs/common';
import { IntegrityModule } from '../integrity/integrity.module';
import { AmAccountsService } from './am-accounts.service';
import { PmHoursService } from './pm-hours.service';
import { ReportsController } from './reports.controller';
import { VisitIntervalsService } from './visit-intervals.service';

@Module({
  imports: [IntegrityModule],
  controllers: [ReportsController],
  providers: [PmHoursService, AmAccountsService, VisitIntervalsService],
})
export class ReportsModule {}
