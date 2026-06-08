import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { ListDoctorsDto } from './dto/list-doctors.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListDoctorsDto) {
    const where: Prisma.DoctorWhereInput = { deletedAt: null };
    if (query.brickId) where.brickId = query.brickId;
    if (query.governorateId) where.governorateId = query.governorateId;
    if (query.class) where.class = query.class;
    if (query.accountType) where.accountType = query.accountType;
    if (query.status) where.status = query.status;
    if (query.specialty) where.specialty = query.specialty;
    if (query.q) {
      where.OR = [
        { nameAr: { contains: query.q } },
        { addressAr: { contains: query.q } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.doctor.findMany({
        where,
        orderBy: [{ class: 'asc' }, { nameAr: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.doctor.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getById(id: string) {
    const d = await this.prisma.doctor.findFirst({ where: { id, deletedAt: null } });
    if (!d) throw new NotFoundException('Doctor not found');
    return d;
  }

  async create(dto: CreateDoctorDto, createdById: string) {
    return this.prisma.doctor.create({
      data: {
        nameAr: dto.nameAr,
        addressAr: dto.addressAr,
        specialty: dto.specialty,
        class: dto.class,
        accountType: dto.accountType,
        accountSubtype: dto.accountSubtype,
        brickId: dto.brickId,
        governorateId: dto.governorateId,
        clinicLat: dto.clinicLat,
        clinicLng: dto.clinicLng,
        status: dto.status ?? 'active',
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateDoctorDto) {
    await this.getById(id);
    return this.prisma.doctor.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    await this.getById(id);
    return this.prisma.doctor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
