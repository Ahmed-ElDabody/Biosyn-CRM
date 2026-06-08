import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { CreateListChangeRequestDto } from './dto/create-list-change.dto';
import { ListChangesService } from './list-changes.service';

@Controller('me/list-changes')
export class MeListChangesController {
  constructor(private svc: ListChangesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.listForRep(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListChangeRequestDto) {
    return this.svc.submitForRep(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.cancelForRep(user.id, id);
  }
}
