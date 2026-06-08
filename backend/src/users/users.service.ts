import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateMeDto, UpdateUserDto } from './dto/update-user.dto';

const SAFE_USER_SELECT = {
  id: true,
  role: true,
  nameEn: true,
  email: true,
  phone: true,
  region: true,
  managerId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.region) where.region = query.region;
    if (query.managerId) where.managerId = query.managerId;
    if (query.q) {
      where.OR = [
        { nameEn: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: [{ role: 'asc' }, { nameEn: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getOrgTree() {
    const users = await this.prisma.user.findMany({
      select: { ...SAFE_USER_SELECT },
      orderBy: [{ role: 'asc' }, { nameEn: 'asc' }],
    });
    type Node = (typeof users)[number] & { reports: Node[] };
    const byId = new Map<string, Node>();
    for (const u of users) byId.set(u.id, { ...u, reports: [] });
    const roots: Node[] = [];
    for (const u of byId.values()) {
      if (u.managerId && byId.has(u.managerId)) byId.get(u.managerId)!.reports.push(u);
      else roots.push(u);
    }
    return roots;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.managerId && dto.managerId === id) {
      throw new BadRequestException('A user cannot be their own manager');
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.managerId !== undefined) {
      data.manager =
        dto.managerId === null ? { disconnect: true } : { connect: { id: dto.managerId } };
    }
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: SAFE_USER_SELECT,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    const data: Prisma.UserUpdateInput = {};
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_USER_SELECT,
    });
  }
}
