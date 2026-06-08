import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { ListVisitsDto } from './dto/list-visits.dto';
import {
  VisitValidationInput,
  VisitValidationService,
} from './visit-validation.service';

@Injectable()
export class VisitsService {
  constructor(
    private prisma: PrismaService,
    private validator: VisitValidationService,
  ) {}

  /**
   * Submit a complete visit (with one or more sessions) from the offline
   * buffer. Server stamps timestamps, validates against the doctor's
   * geofence, computes anti-gaming flags, and stores everything in one
   * transaction.
   *
   * Idempotent on (repId, clientId): re-submitting the same clientId
   * returns the existing record rather than creating a duplicate.
   */
  async createForRep(repId: string, dto: CreateVisitDto) {
    if (dto.clientId) {
      const existing = await this.prisma.visit.findUnique({
        where: { repId_clientId: { repId, clientId: dto.clientId } },
        include: { sessions: true },
      });
      if (existing) return { ...existing, idempotent: true };
    }

    // 1. Doctor must be on the rep's list (active or pending_delete is fine)
    const listEntry = await this.prisma.repDoctorList.findFirst({
      where: { repId, doctorId: dto.doctorId, deletedAt: null },
      include: { doctor: true },
    });
    if (!listEntry) {
      throw new BadRequestException('Doctor is not on your list');
    }
    const doctor = listEntry.doctor;

    // 2. Plan item, if present, must belong to a plan for this rep and target this doctor.
    if (dto.planItemId) {
      const item = await this.prisma.planItem.findFirst({
        where: { id: dto.planItemId, doctorId: dto.doctorId, plan: { repId } },
      });
      if (!item) {
        throw new BadRequestException(
          'plan_item_id does not belong to a plan of this rep for this doctor',
        );
      }
    }

    // 3. Anti-overlap (spec §6.3): no other open visit for this rep right now.
    const open = await this.prisma.visit.findFirst({
      where: { repId, endedAtServer: null },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException(
        'You have an in-progress visit; end it before starting a new one',
      );
    }

    // 4. Prepare timestamps. Server time is the source of truth.
    const now = new Date();
    const startedAtServer = now;
    // For complete bundled submissions from offline, endedAtServer = now too.
    // The client provides the visit window via startedAtClient/endedAtClient;
    // server math uses server stamps but we capture client too for drift analysis.
    const endedAtServer = dto.endedAtClient ? now : null;
    const startedAtClient = new Date(dto.startedAtClient);
    const endedAtClient = dto.endedAtClient
      ? new Date(dto.endedAtClient)
      : null;

    // 5. Previous visit (for short-interval flag)
    const prev = await this.prisma.visit.findFirst({
      where: { repId, endedAtServer: { not: null } },
      orderBy: { endedAtServer: 'desc' },
      select: { endedAtServer: true },
    });

    // 5b. Anti-gaming: a session's slide numbers must fit within the product's
    // page range (sessions use a local 1..k numbering of the product's slice).
    const productIds = [...new Set(dto.sessions.map((s) => s.productId))];
    const sessionProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, totalSlides: true, pageStart: true, pageEnd: true },
    });
    const productById = new Map(sessionProducts.map((p) => [p.id, p]));
    for (const s of dto.sessions) {
      const p = productById.get(s.productId);
      if (!p) {
        throw new BadRequestException(
          `Unknown product ${s.productId} in session`,
        );
      }
      // Range length when an aid is mapped; otherwise fall back to totalSlides.
      const rangeLength =
        p.pageStart != null && p.pageEnd != null
          ? p.pageEnd - p.pageStart + 1
          : p.totalSlides;
      if (s.startSlide > rangeLength || s.maxSlide > rangeLength) {
        throw new BadRequestException(
          `Session slide ${Math.max(s.startSlide, s.maxSlide)} exceeds product page range (${rangeLength}).`,
        );
      }
    }

    // 6. Validate
    const validationInput: VisitValidationInput = {
      accountType: doctor.accountType,
      visitLat: dto.gpsLat ?? null,
      visitLng: dto.gpsLng ?? null,
      clinicLat: doctor.clinicLat,
      clinicLng: doctor.clinicLng,
      startedAtServer,
      endedAtServer,
      startedAtClient,
      endedAtClient,
      sessions: dto.sessions.map((s) => ({
        slidesSeen: s.slidesSeen,
        durationSeconds: s.durationSeconds,
        mockLocationDetected: s.mockLocationDetected,
        clockDriftSeconds: s.clockDriftSeconds,
      })),
      previousVisitEndedAtServer: prev?.endedAtServer ?? null,
    };
    const result = this.validator.validate(validationInput);

    // 7. Persist visit + sessions atomically
    const visit = await this.prisma.visit.create({
      data: {
        clientId: dto.clientId,
        repId,
        doctorId: doctor.id,
        planItemId: dto.planItemId,
        accountType: doctor.accountType,
        startedAtServer,
        endedAtServer,
        startedAtClient,
        endedAtClient,
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
        geofenceOk: result.geofenceOk,
        isValid: result.isValid,
        validityReasons: result.validityReasons,
        flags: result.flags,
        syncedAt: now,
        sessions: {
          create: dto.sessions.map((s) => ({
            clientId: s.clientId,
            productId: s.productId,
            startSlide: s.startSlide,
            slidesSeen: s.slidesSeen,
            maxSlide: s.maxSlide,
            durationSeconds: s.durationSeconds,
            startLat: s.startLat,
            startLng: s.startLng,
            startedAtServer,
            endedAtServer,
            slideEvents: s.slideEvents as unknown as Prisma.InputJsonValue,
            deviceInfo: s.deviceInfo as unknown as Prisma.InputJsonValue,
            mockLocationDetected: s.mockLocationDetected ?? false,
            clockDriftSeconds: s.clockDriftSeconds ?? 0,
          })),
        },
      },
      include: { sessions: true },
    });

    return visit;
  }

  async listForRep(repId: string, q: ListVisitsDto) {
    const where: Prisma.VisitWhereInput = { repId };
    if (q.doctorId) where.doctorId = q.doctorId;
    if (q.from || q.to) {
      where.startedAtServer = {};
      if (q.from) where.startedAtServer.gte = new Date(q.from);
      if (q.to) where.startedAtServer.lt = new Date(q.to);
    }
    if (q.isValid !== undefined) where.isValid = q.isValid === 'true';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.visit.findMany({
        where,
        include: { sessions: true },
        orderBy: { startedAtServer: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.visit.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async getById(repId: string, id: string) {
    const v = await this.prisma.visit.findFirst({
      where: { id, repId },
      include: { sessions: true, doctor: true },
    });
    if (!v) throw new NotFoundException('Visit not found');
    return v;
  }

  async getOpenForRep(repId: string) {
    return this.prisma.visit.findFirst({
      where: { repId, endedAtServer: null },
      include: { sessions: true, doctor: true },
    });
  }
}
