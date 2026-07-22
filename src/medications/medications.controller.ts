import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateMedicationDto, UpdateMedicationDto, RecordMedicationDoseDto } from './dto/medications.dto';
import { MedicationsService } from './medications.service';

@Controller('medications')
export class MedicationsController {
    constructor(
        private readonly medicationsService: MedicationsService,
    ) { }

    @Post()
    create(@Body() dto: CreateMedicationDto) {
        const temporaryUserId = 1;
        return this.medicationsService.createMedication(temporaryUserId, dto);
    }

    @Get()
    findAll() {
        const temporaryUserId = 1;
        return this.medicationsService.getMedications(temporaryUserId);
    }

    @Get('history')
    getHistory() {
        const temporaryUserId = 1;
        return this.medicationsService.getMedicationHistory(temporaryUserId);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateMedicationDto,
    ) {
        const temporaryUserId = 1;
        return this.medicationsService.updateMedication(temporaryUserId, id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        const temporaryUserId = 1;
        return this.medicationsService.deleteMedication(temporaryUserId, id);
    }

    @Post(':id/take')
    take(
        @Param('id') id: string,
        @Body() dto: RecordMedicationDoseDto,
    ) {
        const temporaryUserId = 1;
        return this.medicationsService.takeMedication(temporaryUserId, id, dto.quantityTaken ?? 1);
    }
}
