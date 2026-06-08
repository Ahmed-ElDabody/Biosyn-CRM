import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationType } from './notification-types';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    body: string,
    meta?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        body,
        meta: meta as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createMany(
    userIds: string[],
    type: NotificationType,
    body: string,
    meta?: Record<string, unknown>,
  ) {
    if (userIds.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        body,
        meta: meta as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  async listForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 100, 500),
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    const note = await this.prisma.notification.findUnique({ where: { id } });
    if (!note || note.userId !== userId) throw new NotFoundException();
    if (note.readAt) return note;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
