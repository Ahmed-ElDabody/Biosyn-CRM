import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { LockService } from './lock.service';

@Controller('me/lock-status')
export class MeLockStatusController {
  constructor(private locks: LockService) {}

  @Get()
  status(@CurrentUser() user: AuthUser) {
    return this.locks.statusFor(user.id);
  }
}
