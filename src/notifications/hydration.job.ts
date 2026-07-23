import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from './notifications.service';
import { WaterEntriesService } from 'src/water-entries/water-entries.service';
import { HydrationAiService } from 'src/hydration-ai/hydration_ai.service';

interface HydrationSummaryRow {
    goal_ml: number | string | null;
    consumed_ml: number | string;
}

@Injectable()
export class HydrationJob {
    constructor(
        private readonly database: DatabaseService,
        private readonly notificationsService: NotificationsService,
        private readonly waterEntriesService: WaterEntriesService,
        private readonly hydrationAiService: HydrationAiService
        ,

    ) { }

    @Cron('0 0,30 9-22 * * *', {
        timeZone: 'America/Sao_Paulo',
    })
    async remindWater() {
        await this.sendHydrationReminder(1);
    }

    @Cron('0 0 23 * * *', {
        timeZone: 'America/Sao_Paulo',
    })
    async lastReminder() {
        await this.sendHydrationReminder(1);
    }

    @Cron('0 0 20 * * *', {
        timeZone: 'America/Sao_Paulo',
    })
    async daily7DayAiAnalysis() {
        await this.send7DayAiAnalysis(1);
    }

    public async send7DayAiAnalysis(userId: number): Promise<void> {
        const entries = await this.waterEntriesService.findLast7Days(userId);

        const goalResult = await this.database.query<{ daily_amount_ml: number | string }>(
            `
            SELECT daily_amount_ml
            FROM hydration_goals
            WHERE user_id = $1
              AND starts_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
              AND (ends_at IS NULL OR ends_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)
            ORDER BY starts_at DESC, id DESC
            LIMIT 1
            `,
            [userId],
        );

        const dailyGoalMl = goalResult.rows[0]?.daily_amount_ml
            ? Number(goalResult.rows[0].daily_amount_ml)
            : null;

        const normalizedEntries = entries.map((entry) => ({
            amountMl: Number(entry.amount_ml),
            consumedAt: entry.consumed_at,
        }));

        const analysis = await this.hydrationAiService.analyze7DaysHistory({
            dailyGoalMl,
            entries: normalizedEntries,
        });

        await this.notificationsService.sendTelegram(
            [
                '📊 Análise dos últimos 7 dias (IA)',
                '',
                analysis,
            ].join('\n'),
        );
    }

    private async sendHydrationReminder(userId: number): Promise<void> {
        const result = await this.database.query<HydrationSummaryRow>(
            `
        SELECT
          (
            SELECT daily_amount_ml
            FROM hydration_goals
            WHERE user_id = $1
              AND starts_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
              AND (ends_at IS NULL OR ends_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)
            ORDER BY starts_at DESC, id DESC
            LIMIT 1
          ) AS goal_ml,

          COALESCE(
            (
              SELECT SUM(amount_ml)
              FROM water_entries
              WHERE user_id = $1
                AND consumed_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
                AND consumed_at < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + INTERVAL '1 day'
            ),
            0
          ) AS consumed_ml
      `,
            [userId],
        );

        const row = result.rows[0];

        const goalMl = Number(row.goal_ml ?? 0);
        const consumedMl = Number(row.consumed_ml ?? 0);

        if (goalMl <= 0) {
            await this.notificationsService.sendTelegram(
                '💧 Você ainda não definiu uma meta diária de água.',
            );

            return;
        }

        const remainingMl = Math.max(goalMl - consumedMl, 0);
        const percentage = Math.min(
            Math.round((consumedMl / goalMl) * 100),
            100,
        );

        if (consumedMl >= goalMl) {
            await this.notificationsService.sendTelegram(
                [
                    '🎉 Meta diária atingida!',
                    `Você bebeu ${consumedMl} ml.`,
                    `Meta: ${goalMl} ml.`,
                    `Progresso: ${percentage}%.`,
                ].join('\n'),
            );

            return;
        }

        await this.notificationsService.sendTelegram(
            [
                '💧 Hora de beber água!',
                `Consumido hoje: ${consumedMl} ml`,
                `Meta diária: ${goalMl} ml`,
                `Faltam: ${remainingMl} ml`,
                `Progresso: ${percentage}%`,
            ].join('\n'),
        );
    }

    private async resumeAiSemana(userId: number) {

    }
}