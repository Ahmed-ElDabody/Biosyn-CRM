import { Module } from '@nestjs/common';
import { DetailAidRasterizerService } from './detail-aid-rasterizer.service';

@Module({
  providers: [DetailAidRasterizerService],
  exports: [DetailAidRasterizerService],
})
export class DetailAidModule {}
