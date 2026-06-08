import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateMeDto, UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles('manager', 'admin')
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.getById(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get('org-tree')
  @Roles('manager', 'admin')
  orgTree() {
    return this.users.getOrgTree();
  }

  @Get(':id')
  @Roles('manager', 'admin')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getById(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
}
