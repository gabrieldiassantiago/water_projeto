import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
    ) { }

    @Get('summary')
    getSummary(@Query() query: ReportQueryDto) {
        const temporaryUserId = 1;

        return this.reportsService.getSummary(
            temporaryUserId,
            query.startDate,
            query.endDate,
        );
    }

    @Get('daily')
    getDailyBreakdown(@Query() query: ReportQueryDto) {
        const temporaryUserId = 1;

        return this.reportsService.getDailyBreakdown(
            temporaryUserId,
            query.startDate,
            query.endDate,
        );
    }
}
