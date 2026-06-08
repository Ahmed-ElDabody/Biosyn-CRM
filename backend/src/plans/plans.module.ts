import { Module } from '@nestjs/common';
import { ManagerPlansController } from './manager-plans.controller';
import { MePlansController } from './me-plans.controller';
import { PlansCronService } from './plans-cron.service';
import { PlansService } from './plans.service';

@Module({
  controllers: [MePlansController, ManagerPlansController],
  providers: [PlansService, PlansCronService],
  exports: [PlansService, PlansCronService],
})
export class PlansModule {}
