import { Module } from '@nestjs/common';
import { AdminListChangesController } from './admin-list-changes.controller';
import { ListChangesService } from './list-changes.service';
import { ManagerListChangesController } from './manager-list-changes.controller';
import { MeListChangesController } from './me-list-changes.controller';

@Module({
  controllers: [
    MeListChangesController,
    ManagerListChangesController,
    AdminListChangesController,
  ],
  providers: [ListChangesService],
  exports: [ListChangesService],
})
export class ListChangesModule {}
