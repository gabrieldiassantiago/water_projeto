import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReportsService {
    constructor(private readonly database: DatabaseService) { }

    async getSummary(userId: number, startDate: string, endDate: string) {
        const result = await this.database.query<{
            total_ml: string;
            total_entries: string;
            num_days: string;
        }>(
            `
            SELECT
                COALESCE(SUM(amount_ml), 0) AS total_ml,
                COUNT(*) AS total_entries,
                GREATEST(
                    (DATE($3) - DATE($2)) + 1,
                    1
                ) AS num_days
            FROM water_entries
            WHERE user_id = $1
                AND consumed_at >= $2::date
                AND consumed_at < ($3::date + INTERVAL '1 day')
            `,
            [userId, startDate, endDate],
        );

        const row = result.rows[0];
        const totalMl = Number(row.total_ml);
        const totalEntries = Number(row.total_entries);
        const numDays = Number(row.num_days);

        return {
            totalMl,
            totalEntries,
            averageMlPerDay: numDays > 0 ? Math.round(totalMl / numDays) : 0,
            startDate,
            endDate,
        };
    }

    async getDailyBreakdown(userId: number, startDate: string, endDate: string) {
        const result = await this.database.query<{
            date: string;
            total_ml: string;
            entries: string;
        }>(
            `
            SELECT
                DATE(consumed_at AT TIME ZONE 'America/Sao_Paulo') AS date,
                SUM(amount_ml) AS total_ml,
                COUNT(*) AS entries
            FROM water_entries
            WHERE user_id = $1
                AND consumed_at >= $2::date
                AND consumed_at < ($3::date + INTERVAL '1 day')
            GROUP BY DATE(consumed_at AT TIME ZONE 'America/Sao_Paulo')
            ORDER BY date ASC
            `,
            [userId, startDate, endDate],
        );

        return result.rows.map((row) => ({
            date: row.date,
            totalMl: Number(row.total_ml),
            entries: Number(row.entries),
        }));
    }
}