import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateMedicationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    dosage: string; // Ex: "50mg", "1 comprimido"

    @IsInt()
    @Min(1)
    frequencyPerDay: number; // Quantidade de vezes que deve tomar por dia

    @IsInt()
    @Min(0)
    @IsOptional()
    stockQuantity?: number; // Quantidade inicial em estoque (opcional)
}

export class UpdateMedicationDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    dosage?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    frequencyPerDay?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    stockQuantity?: number;
}

export class RecordMedicationDoseDto {
    @IsInt()
    @Min(1)
    @IsOptional()
    quantityTaken?: number; // Quantidade tomada nesta dose (padrão: 1)
}