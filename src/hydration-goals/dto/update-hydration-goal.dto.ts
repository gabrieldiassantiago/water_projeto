import { IsInt, IsOptional, IsDateString, Max, Min } from 'class-validator';

export class UpdateHydrationGoalDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20_000)
    dailyAmountMl?: number;

    @IsOptional()
    @IsDateString()
    startsAt?: string;

    @IsOptional()
    @IsDateString()
    endsAt?: string;
}
