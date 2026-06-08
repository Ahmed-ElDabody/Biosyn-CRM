import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService,
  ) {}

  /** Liveness: process is up. Trivial. */
  @Public()
  @Get('healthz')
  liveness() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  /** Readiness: dependencies are reachable. Returns 503 if any check fails. */
  @Public()
  @Get('readyz')
  @HttpCode(200)
  async readiness() {
    const checks: Record<string, { ok: boolean; error?: string }> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = { ok: true };
    } catch (err) {
      checks.db = { ok: false, error: (err as Error).message };
    }

    try {
      // Use the private S3 client through StorageService for a HEAD against the bucket
      const bucket = this.config.getOrThrow<string>('S3_BUCKET');
      await (
        this.storage as unknown as { client: { send: (c: HeadBucketCommand) => Promise<unknown> } }
      ).client.send(new HeadBucketCommand({ Bucket: bucket }));
      checks.storage = { ok: true };
    } catch (err) {
      checks.storage = { ok: false, error: (err as Error).message };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    if (!allOk) {
      throw new HttpException({ status: 'degraded', checks }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { status: 'ok', checks };
  }
}
