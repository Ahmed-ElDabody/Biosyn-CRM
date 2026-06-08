import { Module } from '@nestjs/common';
import { DetailAidModule } from '../detail-aid/detail-aid.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [DetailAidModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
