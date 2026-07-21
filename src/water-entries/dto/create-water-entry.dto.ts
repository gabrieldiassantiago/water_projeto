import { IsInt, Max, Min } from 'class-validator';

export class CreateWaterEntryDto {
    @IsInt()
    @Min(1)
    @Max(10_000)
    amountMl: number;
}