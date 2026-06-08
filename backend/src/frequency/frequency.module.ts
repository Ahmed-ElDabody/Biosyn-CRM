import { Global, Module } from '@nestjs/common';
import { FrequencyService } from './frequency.service';

@Global()
@Module({
  providers: [FrequencyService],
  exports: [FrequencyService],
})
export class FrequencyModule {}
