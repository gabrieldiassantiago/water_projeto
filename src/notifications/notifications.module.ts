import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { HydrationJob } from './hydration.job';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from 'src/database/database.service';

@Module({
  imports: [DatabaseModule],
  providers: [NotificationsService, HydrationJob, DatabaseService]
})
export class NotificationsModule { }
