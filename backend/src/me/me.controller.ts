import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { ListMyDoctorsDto } from './dto/list-me-doctors.dto';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private me: MeService) {}

  @Get('doctors')
  listDoctors(@CurrentUser() user: AuthUser, @Query() q: ListMyDoctorsDto) {
    return this.me.listDoctors(user.id, q);
  }

  @Get('doctors/:id')
  getDoctor(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.me.getDoctorDetail(user.id, id);
  }

  @Get('kpis/summary')
  kpiSummary(@CurrentUser() user: AuthUser) {
    return this.me.kpiSummary(user.id);
  }
}
