import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { HydrationJob } from './hydration.job';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { TelegramController } from './telegram.controller';
import { TelegramBotService } from './telegram-bot.service';
import { WaterEntriesModule } from '../water-entries/water-entries.module';
import { HydrationGoalsModule } from '../hydration-goals/hydration-goals.module';

@Module({
  imports: [DatabaseModule, WaterEntriesModule, HydrationGoalsModule],
  controllers: [TelegramController],
  providers: [NotificationsService, TelegramBotService, HydrationJob, DatabaseService],
  exports: [NotificationsService, TelegramBotService],
})
export class NotificationsModule { }
