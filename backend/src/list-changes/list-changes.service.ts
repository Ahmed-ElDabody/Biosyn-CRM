import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListChangeStage, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { LockService } from '../locks/lock.service';
import { NOTIFICATION_TYPES } from '../notifications/notification-types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountPayloadDto } from './dto/create-account-payload.dto';
import { CreateListChangeRequestDto } from './dto/create-list-change.dto';

@Injectable()
export class ListChangesService {
  constructor(
    private prisma: PrismaService,
    private locks: LockService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  // ---------- rep side ----------

  async submitForRep(repId: string, dto: CreateListChangeRequestDto) {
    // Spec §7.2 — rep edits are locked outside the open window
    const lockStatus = await this.locks.statusFor(repId);
    if (lockStatus.locked) {
      throw new ForbiddenException(
        `List edits are locked until ${lockStatus.windowOpensAt} — submit again when the window opens.`,
      );
    }

    if (dto.type === 'add_from_master' || dto.type === 'delete') {
      if (!dto.doctorId) {
        throw new BadRequestException('doctor_id is required for this request type');
      }
      const doctor = await this.prisma.doctor.findFirst({
        where: { id: dto.doctorId, deletedAt: null },
        select: { id: true },
      });
      if (!doctor) throw new BadRequestException('Doctor not found in master list');

      if (dto.type === 'add_from_master') {
        const onList = await this.prisma.repDoctorList.findFirst({
          where: { repId, doctorId: dto.doctorId, deletedAt: null },
          select: { id: true, status: true },
        });
        if (onList?.status === 'active') {
          throw new ConflictException('Doctor is already on your list');
        }
      }
      if (dto.type === 'delete') {
        const onList = await this.prisma.repDoctorList.findFirst({
          where: { repId, doctorId: dto.doctorId, deletedAt: null },
          select: { id: true },
        });
        if (!onList) {
          throw new BadRequestException('Doctor is not on your list');
        }
      }
    }
    if (dto.type === 'create_account' && !dto.payload) {
      throw new BadRequestException('payload is required for create_account requests');
    }

    const req = await this.prisma.listChangeRequest.create({
      data: {
        repId,
        type: dto.type,
        doctorId: dto.type === 'create_account' ? null : dto.doctorId!,
        payload: dto.payload ? (dto.payload as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        stage: 'manager',
      },
    });

    // Notify the rep's manager
    const rep = await this.prisma.user.findUnique({
      where: { id: repId },
      select: { nameEn: true, managerId: true },
    });
    if (rep?.managerId) {
      await this.notifications.create(
        rep.managerId,
        NOTIFICATION_TYPES.LIST_CHANGE_SUBMITTED,
        `${rep.nameEn} submitted a list-change request (${dto.type})`,
        { requestId: req.id, repId, type: dto.type },
      );
    }
    return req;
  }

  async listForRep(repId: string) {
    return this.prisma.listChangeRequest.findMany({
      where: { repId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { select: { id: true, nameAr: true } } },
    });
  }

  async cancelForRep(repId: string, id: string) {
    const req = await this.prisma.listChangeRequest.findFirst({
      where: { id, repId, deletedAt: null },
    });
    if (!req) throw new NotFoundException();
    if (req.stage !== 'manager') {
      throw new BadRequestException(
        'Can only cancel while still pending manager review',
      );
    }
    return this.prisma.listChangeRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------- manager side ----------

  async listForManager(managerId: string, stage?: ListChangeStage) {
    const reps = await this.prisma.user.findMany({
      where: { managerId },
      select: { id: true },
    });
    const repIds = reps.map((r) => r.id);
    if (repIds.length === 0) return [];
    return this.prisma.listChangeRequest.findMany({
      where: {
        repId: { in: repIds },
        deletedAt: null,
        ...(stage ? { stage } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rep: { select: { id: true, nameEn: true } },
        doctor: { select: { id: true, nameAr: true } },
      },
    });
  }

  async managerApprove(managerId: string, id: string) {
    const req = await this.requireManagedRequest(managerId, id);
    if (req.stage !== 'manager') {
      throw new BadRequestException(`Request is at stage ${req.stage}, cannot manager-approve`);
    }
    const updated = await this.prisma.listChangeRequest.update({
      where: { id },
      data: { stage: 'admin', managerId, managerActionAt: new Date() },
    });
    // Notify all admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    });
    await this.notifications.createMany(
      admins.map((a) => a.id),
      NOTIFICATION_TYPES.LIST_CHANGE_MANAGER_APPROVED,
      `Manager forwarded a list-change request (${req.type}) for admin review`,
      { requestId: id, repId: req.repId, type: req.type },
    );
    return updated;
  }

  async managerReject(managerId: string, id: string, reason: string) {
    const req = await this.requireManagedRequest(managerId, id);
    if (req.stage !== 'manager') {
      throw new BadRequestException(`Request is at stage ${req.stage}, cannot reject`);
    }
    const updated = await this.prisma.listChangeRequest.update({
      where: { id },
      data: {
        stage: 'rejected',
        managerId,
        managerActionAt: new Date(),
        rejectReason: reason,
      },
    });
    await this.notifications.create(
      req.repId,
      NOTIFICATION_TYPES.LIST_CHANGE_MANAGER_REJECTED,
      `Your list-change request was rejected by your manager: ${reason}`,
      { requestId: id, type: req.type },
    );
    return updated;
  }

  // ---------- admin side ----------

  async listForAdmin(stage?: ListChangeStage) {
    return this.prisma.listChangeRequest.findMany({
      where: { deletedAt: null, ...(stage ? { stage } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        rep: { select: { id: true, nameEn: true } },
        doctor: { select: { id: true, nameAr: true } },
      },
    });
  }

  /**
   * Admin approval = the REAL apply (spec §7.3). This is the only point where
   * the list actually changes.
   */
  async adminApprove(adminId: string, id: string) {
    const req = await this.prisma.listChangeRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException();
    if (req.stage !== 'admin') {
      throw new BadRequestException(`Request is at stage ${req.stage}, cannot admin-approve`);
    }

    const applied = await this.prisma.$transaction(async (tx) => {
      let newDoctorId: string | null = req.doctorId ?? null;

      if (req.type === 'create_account') {
        const payload = req.payload as unknown as CreateAccountPayloadDto;
        const created = await tx.doctor.create({
          data: {
            nameAr: payload.nameAr,
            addressAr: payload.addressAr,
            specialty: payload.specialty,
            class: payload.class,
            accountType: payload.accountType,
            accountSubtype: payload.accountSubtype,
            brickId: payload.brickId,
            governorateId: payload.governorateId,
            clinicLat: payload.clinicLat,
            clinicLng: payload.clinicLng,
            status: 'active',
            createdById: req.repId,
          },
        });
        newDoctorId = created.id;
        await tx.repDoctorList.create({
          data: { repId: req.repId, doctorId: newDoctorId, status: 'active' },
        });
      } else if (req.type === 'add_from_master') {
        await tx.repDoctorList.upsert({
          where: { repId_doctorId: { repId: req.repId, doctorId: req.doctorId! } },
          update: { status: 'active', deletedAt: null },
          create: { repId: req.repId, doctorId: req.doctorId!, status: 'active' },
        });
      } else if (req.type === 'delete') {
        await tx.repDoctorList.updateMany({
          where: { repId: req.repId, doctorId: req.doctorId! },
          data: { deletedAt: new Date(), status: 'pending_delete' },
        });
      }

      return tx.listChangeRequest.update({
        where: { id },
        data: {
          stage: 'applied',
          adminId,
          adminActionAt: new Date(),
          doctorId: newDoctorId,
        },
      });
    });

    await this.notifications.create(
      req.repId,
      NOTIFICATION_TYPES.LIST_CHANGE_ADMIN_APPLIED,
      `Your list-change request (${req.type}) was approved and applied`,
      { requestId: id, type: req.type },
    );
    await this.audit.record(
      adminId,
      'list_change.admin_applied',
      { type: 'list_change_request', id },
      { requestType: req.type, repId: req.repId },
    );
    return applied;
  }

  async adminReject(adminId: string, id: string, reason: string) {
    const req = await this.prisma.listChangeRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException();
    if (req.stage !== 'admin') {
      throw new BadRequestException(`Request is at stage ${req.stage}, cannot reject`);
    }
    const updated = await this.prisma.listChangeRequest.update({
      where: { id },
      data: {
        stage: 'rejected',
        adminId,
        adminActionAt: new Date(),
        rejectReason: reason,
      },
    });
    await this.notifications.create(
      req.repId,
      NOTIFICATION_TYPES.LIST_CHANGE_ADMIN_REJECTED,
      `Your list-change request was rejected by admin: ${reason}`,
      { requestId: id, type: req.type },
    );
    await this.audit.record(
      adminId,
      'list_change.admin_rejected',
      { type: 'list_change_request', id },
      { requestType: req.type, repId: req.repId, reason },
    );
    return updated;
  }

  // ---------- helpers ----------

  private async requireManagedRequest(managerId: string, id: string) {
    const req = await this.prisma.listChangeRequest.findUnique({
      where: { id },
      include: { rep: { select: { id: true, managerId: true } } },
    });
    if (!req || req.deletedAt) throw new NotFoundException();
    if (req.rep.managerId !== managerId) {
      throw new ForbiddenException('This rep does not report to you');
    }
    return req;
  }
}
