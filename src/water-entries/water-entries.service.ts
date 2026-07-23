import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WaterEntriesService {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    async create(
        userId: string,
        amountMl: number,
    ) {
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
              AND consumed_at >= (
                  (
                      CURRENT_TIMESTAMP
                      AT TIME ZONE 'America/Sao_Paulo'
                  )::date::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
              AND consumed_at < (
                  (
                      (
                          CURRENT_TIMESTAMP
                          AT TIME ZONE 'America/Sao_Paulo'
                      )::date + 1
                  )::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
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
                COALESCE(
                    SUM(amount_ml),
                    0
                ) AS total_ml
            FROM water_entries
            WHERE user_id = $1
              AND consumed_at >= (
                  (
                      CURRENT_TIMESTAMP
                      AT TIME ZONE 'America/Sao_Paulo'
                  )::date::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
              AND consumed_at < (
                  (
                      (
                          CURRENT_TIMESTAMP
                          AT TIME ZONE 'America/Sao_Paulo'
                      )::date + 1
                  )::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
            `,
            [userId],
        );

        return {
            totalMl: Number(
                result.rows[0]?.total_ml ?? 0,
            ),
        };
    }

    async findLast7Days(userId: number) {
        const result = await this.database.query<{
            id: number;
            user_id: number;
            amount_ml: number | string;
            consumed_at: Date | string;
            created_at: Date | string;
        }>(
            `
            SELECT
                id,
                user_id,
                amount_ml,
                consumed_at,
                created_at
            FROM water_entries
            WHERE user_id = $1
              AND consumed_at >= (
                  (
                      (
                          CURRENT_TIMESTAMP
                          AT TIME ZONE 'America/Sao_Paulo'
                      )::date - INTERVAL '6 days'
                  )::timestamp
                  AT TIME ZONE 'America/Sao_Paulo'
              )
            ORDER BY consumed_at ASC
            `,
            [userId],
        );

        return result.rows;
    }
}