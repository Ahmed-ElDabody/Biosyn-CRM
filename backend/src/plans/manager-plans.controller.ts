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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { ListManagerPlansDto } from './dto/list-manager-plans.dto';
import { RejectPlanDto } from './dto/reject-plan.dto';
import { PlansService } from './plans.service';

@Controller('manager/plans')
@UseGuards(RolesGuard)
@Roles('manager', 'admin')
export class ManagerPlansController {
  constructor(private plans: PlansService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListManagerPlansDto) {
    return this.plans.listForManager(user.id, q);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.plans.approve(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPlanDto,
  ) {
    return this.plans.reject(user.id, id, dto.reason);
  }
}
