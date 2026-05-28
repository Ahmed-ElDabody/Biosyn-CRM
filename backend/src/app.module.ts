import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DoctorsModule } from './doctors/doctors.module';
import { FrequencyModule } from './frequency/frequency.module';
import { GeofenceModule } from './geofence/geofence.module';
import { HealthModule } from './health/health.module';
import { IntegrityModule } from './integrity/integrity.module';
import { KpisModule } from './kpis/kpis.module';
import { ListChangesModule } from './list-changes/list-changes.module';
import { LocksModule } from './locks/locks.module';
import { MasterDataModule } from './master-data/master-data.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { SyncModule } from './sync/sync.module';
import { UsersModule } from './users/users.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      // global default — 100 req/min/IP. Specific routes override via @Throttle.
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),
    PrismaModule,
    StorageModule,
    AuditModule,
    NotificationsModule,
    LocksModule,
    FrequencyModule,
    GeofenceModule,
    AuthModule,
    UsersModule,
    MasterDataModule,
    DoctorsModule,
    ProductsModule,
    MeModule,
    VisitsModule,
    SyncModule,
    PlansModule,
    ListChangesModule,
    KpisModule,
    IntegrityModule,
    ReportsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard runs BEFORE JwtAuthGuard so unauthenticated brute-force
    // attempts still get rate-limited.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
