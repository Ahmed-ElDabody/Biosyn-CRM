import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface ListBricksQuery {
  q?: string;
  governorateId?: string;
  page?: number;
  pageSize?: number;
}

interface ListSubBricksQuery {
  q?: string;
  parentBrickId?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

@Injectable()
export class MasterDataService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const [
      governorates,
      bricks,
      subBricks,
      users,
      managers,
      reps,
      admins,
      doctors,
      products,
    ] = await this.prisma.$transaction([
      this.prisma.governorate.count(),
      this.prisma.brick.count(),
      this.prisma.subBrick.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'manager' } }),
      this.prisma.user.count({ where: { role: 'rep' } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.doctor.count({ where: { deletedAt: null } }),
      this.prisma.product.count(),
    ]);
    return {
      governorates,
      bricks,
      subBricks,
      users: { total: users, admins, managers, reps },
      doctors,
      products,
    };
  }

  async listGovernorates() {
    return this.prisma.governorate.findMany({
      orderBy: { nameEn: 'asc' },
      select: { id: true, nameEn: true, nameAr: true },
    });
  }

  async listBricks(query: ListBricksQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
    );
    const where: Prisma.BrickWhereInput = {};
    if (query.governorateId) where.governorateId = query.governorateId;
    if (query.q) {
      where.OR = [
        { nameEn: { contains: query.q, mode: 'insensitive' } },
        { code: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.brick.findMany({
        where,
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameAr: true,
          area: true,
          governorate: { select: { id: true, nameEn: true } },
        },
        // Numeric sort by the digits in the code so B1..B148 read naturally
        // rather than B1, B10, B100, ...
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.brick.count({ where }),
    ]);
    items.sort((a, b) => {
      const an = Number((a.code ?? '').replace(/\D/g, '')) || 0;
      const bn = Number((b.code ?? '').replace(/\D/g, '')) || 0;
      return an - bn;
    });
    return { items, total, page, pageSize };
  }

  async listSubBricks(query: ListSubBricksQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
    );
    const where: Prisma.SubBrickWhereInput = {};
    if (query.parentBrickId) where.parentBrickId = query.parentBrickId;
    if (query.q) {
      where.nameEn = { contains: query.q, mode: 'insensitive' };
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.subBrick.findMany({
        where,
        select: {
          id: true,
          nameEn: true,
          parentBrick: {
            select: { id: true, code: true, nameEn: true },
          },
        },
        orderBy: [{ parentBrick: { code: 'asc' } }, { nameEn: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subBrick.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
