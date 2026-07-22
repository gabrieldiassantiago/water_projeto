import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { WaterEntriesModule } from './water-entries/water-entries.module';
import { HydrationGoalsModule } from './hydration-goals/hydration-goals.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerMiddleware } from './common/logger.middleware';
import { MedicationsModule } from './medications/medications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    WaterEntriesModule,
    HydrationGoalsModule,
    ReportsModule,
    NotificationsModule,
    MedicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

