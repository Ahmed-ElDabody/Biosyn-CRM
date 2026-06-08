import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { CreateLockOverrideDto } from './dto/create-lock.dto';
import { LockService } from './lock.service';

@Controller('admin/list-locks')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminLocksController {
  constructor(private locks: LockService) {}

  @Get()
  list() {
    return this.locks.listAllOverrides();
  }

  @Post()
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateLockOverrideDto) {
    return this.locks.createOverride(
      admin.id,
      dto.repId,
      new Date(dto.opensAt),
      new Date(dto.closesAt),
      dto.reason,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.locks.revokeOverride(id, admin.id);
  }
}
