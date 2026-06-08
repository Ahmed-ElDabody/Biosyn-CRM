import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ListChangeStage } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { RejectListChangeDto } from './dto/reject-list-change.dto';
import { ListChangesService } from './list-changes.service';

@Controller('admin/list-changes')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminListChangesController {
  constructor(private svc: ListChangesService) {}

  @Get()
  list(@Query('stage') stage?: ListChangeStage) {
    return this.svc.listForAdmin(stage);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.adminApprove(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectListChangeDto,
  ) {
    return this.svc.adminReject(user.id, id, dto.reason);
  }
}
