import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MasterDataService } from './master-data.service';

@Controller('master-data')
@UseGuards(RolesGuard)
@Roles('admin', 'manager')
export class MasterDataController {
  constructor(private md: MasterDataService) {}

  @Get('stats')
  stats() {
    return this.md.stats();
  }

  @Get('governorates')
  governorates() {
    return this.md.listGovernorates();
  }

  @Get('bricks')
  bricks(
    @Query('q') q?: string,
    @Query('governorateId') governorateId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.md.listBricks({
      q,
      governorateId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('sub-bricks')
  subBricks(
    @Query('q') q?: string,
    @Query('parentBrickId') parentBrickId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.md.listSubBricks({
      q,
      parentBrickId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
