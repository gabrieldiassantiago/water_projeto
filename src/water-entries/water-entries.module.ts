import { Module } from '@nestjs/common';
import { WaterEntriesController } from './water-entries.controller';
import { WaterEntriesService } from './water-entries.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [WaterEntriesController],
  providers: [WaterEntriesService, DatabaseService],
  exports: [WaterEntriesService],
})
export class WaterEntriesModule { }
