import {
    Injectable,
    OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class NotificationsService
    implements OnApplicationBootstrap {
    constructor(
        private readonly configService: ConfigService,
        private readonly database: DatabaseService,
    ) { }

    async onApplicationBootstrap() {
        try {
            await this.sendStartupSummary();
        } catch (error) {
            console.error(error);
        }
    }

    private async sendStartupSummary() {
        const result = await this.database.query(
            `
      SELECT
        (
          SELECT daily_amount_ml
          FROM hydration_goals
          WHERE user_id = 1
          ORDER BY id DESC
          LIMIT 1
        ) AS goal_ml,

        COALESCE(
          (
            SELECT SUM(amount_ml)
            FROM water_entries
            WHERE user_id = 1
              AND consumed_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
          ),
          0
        ) AS consumed_ml
      `,
        );

        const goalMl = Number(result.rows[0].goal_ml ?? 0);
        const consumedMl = Number(result.rows[0].consumed_ml ?? 0);

        const remainingMl = Math.max(
            goalMl - consumedMl,
            0,
        );

        const percentage =
            goalMl > 0
                ? Math.round((consumedMl / goalMl) * 100)
                : 0;

        await this.sendTelegram(
            `
🚀 Water Manager iniciado

💧 Consumido hoje: ${consumedMl} ml
🎯 Meta diária: ${goalMl} ml
📉 Restante: ${remainingMl} ml
📊 Progresso: ${percentage}%
      `,
        );
    }

    async sendTelegram(text: string): Promise<void> {
        const token =
            this.configService.get<string>('TELEGRAM_BOT_TOKEN');

        const chatId =
            this.configService.get<string>('TELEGRAM_CHAT_ID');

        if (!token || !chatId) {
            throw new Error(
                'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados',
            );
        }

        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                }),
            },
        );

        if (!response.ok) {
            const error = await response.text();

            throw new Error(
                `Erro ao enviar mensagem ao Telegram: ${error}`,
            );
        }
    }
}