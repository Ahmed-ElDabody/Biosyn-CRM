import { Global, Module } from '@nestjs/common';
import { MeNotificationsController } from './me-notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [MeNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
