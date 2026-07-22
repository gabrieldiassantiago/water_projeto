import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateHydrationGoalDto } from './dto/create-hydration-goal.dto';
import { UpdateHydrationGoalDto } from './dto/update-hydration-goal.dto';

@Injectable()
export class HydrationGoalsService {
    constructor(private readonly database: DatabaseService) { }

    async create(userId: number, dto: CreateHydrationGoalDto) {
        const params: any[] = [userId, dto.dailyAmountMl];
        const columns = ['user_id', 'daily_amount_ml'];
        const placeholders = ['$1', '$2'];

        if (dto.startsAt) {
            columns.push('starts_at');
            placeholders.push(`$${params.length + 1}`);
            params.push(dto.startsAt);
        }

        if (dto.endsAt) {
            columns.push('ends_at');
            placeholders.push(`$${params.length + 1}`);
            params.push(dto.endsAt);
        }

        const result = await this.database.query(
            `
            INSERT INTO hydration_goals (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING
                id,
                user_id,
                daily_amount_ml,
                starts_at,
                ends_at
            `,
            params,
        );

        return result.rows[0];
    }

    async findCurrent(userId: number) {
        const result = await this.database.query(
            `
            SELECT
                id,
                user_id,
                daily_amount_ml,
                starts_at,
                ends_at
            FROM hydration_goals
            WHERE user_id = $1
                AND starts_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
                AND (ends_at IS NULL OR ends_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)
            ORDER BY starts_at DESC
            LIMIT 1
            `,
            [userId],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Nenhuma meta de hidratação ativa encontrada.');
        }

        return result.rows[0];
    }

    async update(goalId: number, userId: number, dto: UpdateHydrationGoalDto) {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (dto.dailyAmountMl !== undefined) {
            setClauses.push(`daily_amount_ml = $${paramIndex++}`);
            params.push(dto.dailyAmountMl);
        }

        if (dto.startsAt !== undefined) {
            setClauses.push(`starts_at = $${paramIndex++}`);
            params.push(dto.startsAt);
        }

        if (dto.endsAt !== undefined) {
            setClauses.push(`ends_at = $${paramIndex++}`);
            params.push(dto.endsAt);
        }

        if (setClauses.length === 0) {
            return this.findCurrent(userId);
        }

        params.push(goalId, userId);

        const result = await this.database.query(
            `
            UPDATE hydration_goals
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex++}
                AND user_id = $${paramIndex}
            RETURNING
                id,
                user_id,
                daily_amount_ml,
                starts_at,
                ends_at
            `,
            params,
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Meta de hidratação não encontrada.');
        }

        return result.rows[0];
    }

    async getProgress(userId: number) {
        const goal = await this.findCurrent(userId);

        const result = await this.database.query<{
            consumed_ml: string;
        }>(
            `
        SELECT
            COALESCE(
                SUM(amount_ml),
                0
            ) AS consumed_ml
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

        const consumedMl = Number(
            result.rows[0]?.consumed_ml ?? 0,
        );

        const dailyAmountMl = Number(
            goal.daily_amount_ml,
        );

        const remainingMl = Math.max(
            0,
            dailyAmountMl - consumedMl,
        );

        const percentage =
            dailyAmountMl > 0
                ? Math.min(
                    100,
                    Math.round(
                        (consumedMl / dailyAmountMl) *
                        100,
                    ),
                )
                : 0;

        return {
            goal: {
                id: goal.id,
                dailyAmountMl,
                startsAt: goal.starts_at,
                endsAt: goal.ends_at,
            },
            today: {
                consumedMl,
                remainingMl,
                percentage,
            },
        };
    }
}
