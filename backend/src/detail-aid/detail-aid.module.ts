import { Module } from '@nestjs/common';
import { DetailAidRasterizerService } from './detail-aid-rasterizer.service';
import { DetailAidsController } from './detail-aids.controller';
import { DetailAidsService } from './detail-aids.service';

@Module({
  controllers: [DetailAidsController],
  providers: [DetailAidRasterizerService, DetailAidsService],
  exports: [DetailAidsService],
})
export class DetailAidModule {}
