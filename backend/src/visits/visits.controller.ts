import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { CreateVisitDto } from './dto/create-visit.dto';
import { ListVisitsDto } from './dto/list-visits.dto';
import { VisitsService } from './visits.service';

@Controller('me/visits')
export class VisitsController {
  constructor(private visits: VisitsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVisitDto) {
    return this.visits.createForRep(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListVisitsDto) {
    return this.visits.listForRep(user.id, q);
  }

  @Get('open')
  open(@CurrentUser() user: AuthUser) {
    return this.visits.getOpenForRep(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.visits.getById(user.id, id);
  }
}
