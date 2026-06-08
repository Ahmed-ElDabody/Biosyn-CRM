import { Module } from '@nestjs/common';
import { VisitValidationService } from './visit-validation.service';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  controllers: [VisitsController],
  providers: [VisitsService, VisitValidationService],
  exports: [VisitsService, VisitValidationService],
})
export class VisitsModule {}
