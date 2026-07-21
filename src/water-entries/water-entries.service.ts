import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WaterEntriesService {
    constructor(private readonly database: DatabaseService) { }

    async create(userId: string, amountMl: number) {
        const result = await this.database.query(
            `
        INSERT INTO water_entries (
          user_id,
          amount_ml
        )
        VALUES ($1, $2)
        RETURNING
          id,
          user_id,
          amount_ml,
          consumed_at,
          created_at
      `,
            [userId, amountMl],
        );

        return result.rows[0];
    }

    async findToday(userId: number) {
        const result = await this.database.query(
            `
        SELECT
          id,
          user_id,
          amount_ml,
          consumed_at,
          created_at
        FROM water_entries
        WHERE user_id = $1
          AND consumed_at >= CURRENT_DATE
          AND consumed_at < CURRENT_DATE + INTERVAL '1 day'
        ORDER BY consumed_at DESC
      `,
            [userId],
        );

        return result.rows;
    }

    async getTodayTotal(userId: number) {
        const result = await this.database.query<{
            total_ml: string;
        }>(
            `
        SELECT
          COALESCE(SUM(amount_ml), 0) AS total_ml
        FROM water_entries
        WHERE user_id = $1
          AND consumed_at >= CURRENT_DATE
          AND consumed_at < CURRENT_DATE + INTERVAL '1 day'
      `,
            [userId],
        );

        return {
            totalMl: Number(result.rows[0].total_ml),
        };
    }
}