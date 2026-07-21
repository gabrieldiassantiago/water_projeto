import { IsDateString } from 'class-validator';

export class ReportQueryDto {
    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;
}
