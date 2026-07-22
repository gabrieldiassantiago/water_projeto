import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";
import { CreateMedicationDto, UpdateMedicationDto } from "./dto/medications.dto";

@Injectable()
export class MedicationsService {
    private readonly logger = new Logger(MedicationsService.name);

    constructor(
        private readonly database: DatabaseService,
    ) { }

    async createMedication(userId: number = 1, data: CreateMedicationDto) {
        this.logger.log(`Criando medicamento para o usuário ${userId}`);
        const result = await this.database.query(
            `
            INSERT INTO medications (
                user_id,
                name,
                dosage,
                frequency_per_day
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [
                userId,
                data.name,
                data.dosage,
                data.frequencyPerDay
            ]
        );
        return result.rows[0];
    }

    async getMedications(userId: number = 1) {
        this.logger.log(`Buscando medicamentos para o usuário ${userId}`);
        const result = await this.database.query(
            `
            SELECT 
                m.id,
                m.user_id AS "userId",
                m.name,
                m.dosage,
                m.frequency_per_day AS "frequencyPerDay",
                m.created_at AS "createdAt",
                m.updated_at AS "updatedAt",
                COALESCE(SUM(l.quantity_taken), 0)::integer AS "takenToday"
            FROM medications m
            LEFT JOIN medication_logs l ON m.id = l.medication_id
              AND l.taken_at >= (
                  (
                      CURRENT_TIMESTAMP
                      AT TIME ZONE 'America/Sao_Paulo'
                  )::date::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
              AND l.taken_at < (
                  (
                      (
                          CURRENT_TIMESTAMP
                          AT TIME ZONE 'America/Sao_Paulo'
                      )::date + 1
                  )::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
            WHERE m.user_id = $1
            GROUP BY m.id
            ORDER BY m.name ASC
            `,
            [userId]
        );
        return result.rows;
    }

    async updateMedication(userId: number = 1, medicationId: string, data: UpdateMedicationDto) {
        this.logger.log(`Atualizando medicamento ${medicationId} para o usuário ${userId}`);
        const result = await this.database.query(
            `
            UPDATE medications
            SET 
                name = COALESCE($2, name),
                dosage = COALESCE($3, dosage),
                frequency_per_day = COALESCE($4, frequency_per_day),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
              AND id = $5
            RETURNING *
            `,
            [
                userId,
                data.name,
                data.dosage,
                data.frequencyPerDay,
                medicationId
            ]
        );
        if (result.rows.length === 0) {
            throw new NotFoundException('Medicamento não encontrado');
        }
        return result.rows[0];
    }

    async deleteMedication(userId: number = 1, medicationId: string) {
        this.logger.log(`Deletando medicamento ${medicationId} para o usuário ${userId}`);
        const result = await this.database.query(
            `
            DELETE FROM medications
            WHERE user_id = $1
              AND id = $2
            RETURNING *
            `,
            [
                userId,
                medicationId
            ]
        );
        if (result.rows.length === 0) {
            throw new NotFoundException('Medicamento não encontrado');
        }
        return result.rows[0];
    }

    async getMedicationHistory(userId: number = 1) {
        this.logger.log(`Buscando histórico de medicamentos para o usuário ${userId}`);
        const result = await this.database.query(
            `
            SELECT 
                l.id AS "logId",
                l.taken_at AS "takenAt",
                l.quantity_taken AS "quantityTaken",
                m.id AS "medicationId",
                m.name AS "medicationName",
                m.dosage AS "dosage"
            FROM medication_logs l
            INNER JOIN medications m ON l.medication_id = m.id
            WHERE m.user_id = $1
            ORDER BY l.taken_at DESC
            `,
            [userId]
        );
        return result.rows;
    }

    async takeMedication(userId: number = 1, medicationId: string, quantity: number = 1) {
        this.logger.log(`Registrando dose do medicamento ${medicationId} para o usuário ${userId}`);

        const checkResult = await this.database.query(
            `SELECT id FROM medications WHERE id = $1 AND user_id = $2`,
            [medicationId, userId]
        );

        if (checkResult.rows.length === 0) {
            throw new NotFoundException('Medicamento não encontrado');
        }

        const result = await this.database.query(
            `
            INSERT INTO medication_logs (
                medication_id,
                quantity_taken
            )
            VALUES ($1, $2)
            RETURNING *
            `,
            [
                medicationId,
                quantity
            ]
        );
        return result.rows[0];
    }
}