import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { UpsertPlanItemsDto } from './dto/upsert-plan-items.dto';
import { PlansService } from './plans.service';

@Controller('me/plans')
export class MePlansController {
  constructor(private plans: PlansService) {}

  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.plans.getCurrent(user.id);
  }

  @Get('next')
  next(@CurrentUser() user: AuthUser) {
    return this.plans.getNextWeek(user.id);
  }

  @Get(':year/:isoWeek')
  byWeek(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('isoWeek', ParseIntPipe) isoWeek: number,
  ) {
    return {
      plan: this.plans.getByWeek(user.id, year, isoWeek),
      deadlines: PlansService.deadlines(year, isoWeek),
    };
  }

  @Put(':year/:isoWeek/items')
  upsertItems(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('isoWeek', ParseIntPipe) isoWeek: number,
    @Body() dto: UpsertPlanItemsDto,
  ) {
    return this.plans.upsertItems(user.id, year, isoWeek, dto);
  }

  @Post(':year/:isoWeek/submit')
  @HttpCode(200)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('isoWeek', ParseIntPipe) isoWeek: number,
  ) {
    return this.plans.submit(user.id, year, isoWeek);
  }

  @Delete(':year/:isoWeek')
  @HttpCode(204)
  async deleteDraft(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('isoWeek', ParseIntPipe) isoWeek: number,
  ) {
    await this.plans.deleteDraft(user.id, year, isoWeek);
  }
}
