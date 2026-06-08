import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { IntegrityController } from './integrity.controller';
import { IntegrityScope } from './integrity-scope';
import { IntegrityService } from './integrity.service';
import { RouteReplayService } from './route-replay.service';

@Module({
  controllers: [IntegrityController],
  providers: [IntegrityService, RouteReplayService, InsightsService, IntegrityScope],
  exports: [IntegrityService, RouteReplayService, InsightsService, IntegrityScope],
})
export class IntegrityModule {}
