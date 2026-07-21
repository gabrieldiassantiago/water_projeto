import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateWaterEntryDto } from './dto/create-water-entry.dto';
import { WaterEntriesService } from './water-entries.service';

@Controller('water-entries')
export class WaterEntriesController {
    constructor(
        private readonly waterEntriesService: WaterEntriesService,
    ) { }

    @Post()
    create(@Body() dto: CreateWaterEntryDto) {
        const temporaryUserId = '1';

        return this.waterEntriesService.create(
            temporaryUserId,
            dto.amountMl,
        );
    }

    @Get('today')
    findToday() {
        const temporaryUserId = 1;

        return this.waterEntriesService.findToday(temporaryUserId);
    }

    @Get('today/total')
    getTodayTotal() {
        const temporaryUserId = 1;

        return this.waterEntriesService.getTodayTotal(
            temporaryUserId,
        );
    }
}