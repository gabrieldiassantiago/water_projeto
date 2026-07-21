import { Module } from '@nestjs/common';
import { HydrationGoalsController } from './hydration-goals.controller';
import { HydrationGoalsService } from './hydration-goals.service';
import { DatabaseService } from '../database/database.service';

@Module({
    controllers: [HydrationGoalsController],
    providers: [HydrationGoalsService, DatabaseService],
})
export class HydrationGoalsModule { }
