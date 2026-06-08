import { Global, Module } from '@nestjs/common';
import { AdminLocksController } from './admin-locks.controller';
import { LockService } from './lock.service';
import { MeLockStatusController } from './me-lock-status.controller';

@Global()
@Module({
  controllers: [AdminLocksController, MeLockStatusController],
  providers: [LockService],
  exports: [LockService],
})
export class LocksModule {}
