import { Module } from '@nestjs/common';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [MedicationsController],
  providers: [MedicationsService, DatabaseService],
  exports: [MedicationsService],
})
export class MedicationsModule { }
