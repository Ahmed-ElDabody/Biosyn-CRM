import { Global, Module } from '@nestjs/common';
import { AdminKpisController } from './admin-kpis.controller';
import { KpiService } from './kpi.service';
import { ManagerKpisController } from './manager-kpis.controller';
import { MeKpisController } from './me-kpis.controller';

@Global()
@Module({
  controllers: [MeKpisController, ManagerKpisController, AdminKpisController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpisModule {}
