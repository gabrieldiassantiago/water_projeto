import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WaterEntriesService } from '../water-entries/water-entries.service';
import { HydrationGoalsService } from '../hydration-goals/hydration-goals.service';
import { NotificationsService } from './notifications.service';
import { HydrationAiService } from '../hydration-ai/hydration_ai.service';

export interface TelegramUpdate {
    update_id: number;

    message?: {
        message_id: number;

        from?: {
            id: number;
            first_name?: string;
            username?: string;
        };

        chat: {
            id: number | string;
            type: string;
        };

        text?: string;
        date: number;
    };
}

interface WaterEntry {
    amount_ml: number | string;
    consumed_at: Date | string;
}

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(
        TelegramBotService.name,
    );

    constructor(
        private readonly configService: ConfigService,
        private readonly waterEntriesService: WaterEntriesService,
        private readonly hydrationGoalsService: HydrationGoalsService,
        private readonly notificationsService: NotificationsService,
        private readonly hydrationAiService: HydrationAiService,
    ) { }

    async handleUpdate(
        update: TelegramUpdate,
    ): Promise<void> {
        if (!update.message?.text) {
            return;
        }

        const chatId = update.message.chat.id;
        const text = update.message.text.trim();

        const userId = 1;

        this.logger.log(
            `Mensagem recebida do Telegram (${chatId}): "${text}"`,
        );

        try {
            if (/^\/(start|help|ajuda)(?:@\w+)?$/i.test(text)) {
                await this.sendHelpMessage();
                return;
            }

            if (
                /^\/(status|hoje|progresso)(?:@\w+)?$/i.test(
                    text,
                )
            ) {
                await this.sendStatusMessage(userId);
                return;
            }

            if (
                /^\/(historico|history)(?:@\w+)?$/i.test(
                    text,
                )
            ) {
                await this.sendHistoryMessage(userId);
                return;
            }

            const metaMatch = text.match(
                /^\/meta(?:@\w+)?\s+(\d+)\s*(?:ml)?$/i,
            );

            if (metaMatch) {
                const amountMl = Number.parseInt(
                    metaMatch[1],
                    10,
                );

                if (amountMl < 100 || amountMl > 10000) {
                    await this.notificationsService.sendTelegram(
                        '⚠️ Informe uma meta entre 100 ml e 10.000 ml.\n\nExemplo: /meta 2500',
                    );

                    return;
                }

                await this.setGoal(userId, amountMl);
                return;
            }

            if (
                /^\/(semana|7dias|semanal)(?:@\w+)?$/i.test(
                    text,
                )
            ) {
                await this.sendWeeklyAiAnalysis(userId);
                return;
            }

            const aiMatch = text.match(
                /^\/(?:ia|analisar)(?:@\w+)?(?:\s+([\s\S]+))?$/i,
            );

            if (aiMatch) {
                const question =
                    aiMatch[1]?.trim() ||
                    'Analise minha hidratação de hoje.';

                await this.sendAiAnalysis(
                    userId,
                    question,
                );

                return;
            }

            const beberMatch = text.match(
                /^(?:(?:\/beber|\/add)(?:@\w+)?|\+)?\s*(\d+)\s*(?:ml)?$/i,
            );

            if (beberMatch) {
                const amountMl = Number.parseInt(
                    beberMatch[1],
                    10,
                );

                if (amountMl <= 0 || amountMl > 10000) {
                    await this.notificationsService.sendTelegram(
                        '⚠️ Informe uma quantidade entre 1 ml e 10.000 ml.\n\nExemplo: /beber 300',
                    );

                    return;
                }

                await this.addWaterEntry(
                    userId,
                    amountMl,
                );

                return;
            }

            await this.notificationsService.sendTelegram(
                [
                    '❓ Comando não reconhecido.',
                    '',
                    'Digite /ajuda para ver os comandos disponíveis.',
                ].join('\n'),
            );
        } catch (error) {
            this.logger.error(
                'Erro ao processar mensagem do Telegram',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            try {
                await this.notificationsService.sendTelegram(
                    '❌ Ocorreu um erro ao processar seu comando. Tente novamente em instantes.',
                );
            } catch (notificationError) {
                this.logger.error(
                    'Erro ao enviar mensagem de erro ao Telegram',
                    notificationError instanceof Error
                        ? notificationError.stack
                        : String(notificationError),
                );
            }
        }
    }

    private async addWaterEntry(
        userId: number,
        amountMl: number,
    ): Promise<void> {
        await this.waterEntriesService.create(
            String(userId),
            amountMl,
        );

        let progressInfo = '';

        try {
            const progress =
                await this.hydrationGoalsService.getProgress(
                    userId,
                );

            const {
                consumedMl,
                remainingMl,
                percentage,
            } = progress.today;

            const dailyGoal =
                progress.goal.dailyAmountMl;

            progressInfo = [
                '',
                `💧 Consumido hoje: ${Number(
                    consumedMl,
                ).toLocaleString('pt-BR')} ml`,
                `🎯 Meta diária: ${Number(
                    dailyGoal,
                ).toLocaleString('pt-BR')} ml`,
                `📉 Restam: ${Number(
                    remainingMl,
                ).toLocaleString('pt-BR')} ml`,
                `📊 Progresso: ${percentage}%`,
                percentage >= 100
                    ? ''
                    : '',
                percentage >= 100
                    ? '🎉 Parabéns! Você atingiu sua meta diária!'
                    : '',
            ]
                .filter(Boolean)
                .join('\n');
        } catch {
            const total =
                await this.waterEntriesService.getTodayTotal(
                    userId,
                );

            progressInfo = `\n💧 Consumido hoje: ${Number(
                total.totalMl,
            ).toLocaleString('pt-BR')} ml`;
        }

        const message = [
            `✅ +${amountMl.toLocaleString(
                'pt-BR',
            )} ml registrados com sucesso!`,
            progressInfo,
        ].join('');

        await this.notificationsService.sendTelegram(
            message,
        );
    }

    private async sendStatusMessage(
        userId: number,
    ): Promise<void> {
        try {
            const progress =
                await this.hydrationGoalsService.getProgress(
                    userId,
                );

            const {
                consumedMl,
                remainingMl,
                percentage,
            } = progress.today;

            const dailyGoal =
                progress.goal.dailyAmountMl;

            const message = [
                '📊 Status de hidratação de hoje',
                '',
                `💧 Consumido: ${Number(
                    consumedMl,
                ).toLocaleString('pt-BR')} ml`,
                `🎯 Meta diária: ${Number(
                    dailyGoal,
                ).toLocaleString('pt-BR')} ml`,
                `📉 Restam: ${Number(
                    remainingMl,
                ).toLocaleString('pt-BR')} ml`,
                `📊 Progresso: ${percentage}%`,
            ].join('\n');

            await this.notificationsService.sendTelegram(
                message,
            );
        } catch {
            const total =
                await this.waterEntriesService.getTodayTotal(
                    userId,
                );

            await this.notificationsService.sendTelegram(
                [
                    `📊 Consumido hoje: ${Number(
                        total.totalMl,
                    ).toLocaleString('pt-BR')} ml`,
                    '',
                    'Defina uma meta usando /meta 2500 para visualizar seu progresso.',
                ].join('\n'),
            );
        }
    }

    private async setGoal(
        userId: number,
        dailyAmountMl: number,
    ): Promise<void> {
        try {
            const currentGoal =
                await this.hydrationGoalsService.findCurrent(
                    userId,
                );

            await this.hydrationGoalsService.update(
                currentGoal.id,
                userId,
                {
                    dailyAmountMl,
                },
            );
        } catch {
            await this.hydrationGoalsService.create(
                userId,
                {
                    dailyAmountMl,
                },
            );
        }

        await this.notificationsService.sendTelegram(
            `🎯 Nova meta de hidratação definida para ${dailyAmountMl.toLocaleString(
                'pt-BR',
            )} ml por dia!`,
        );
    }

    private async sendHistoryMessage(
        userId: number,
    ): Promise<void> {
        const entries =
            (await this.waterEntriesService.findToday(
                userId,
            )) as WaterEntry[];

        if (!entries || entries.length === 0) {
            await this.notificationsService.sendTelegram(
                '🏜️ Nenhum registro de consumo de água hoje.',
            );

            return;
        }

        const lines = entries.map((entry) => {
            const time = new Date(
                entry.consumed_at,
            ).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo',
            });

            const amountMl = Number(
                entry.amount_ml,
            );

            return `• ${amountMl.toLocaleString(
                'pt-BR',
            )} ml às ${time}`;
        });

        const total = entries.reduce(
            (accumulator, entry) =>
                accumulator +
                Number(entry.amount_ml),
            0,
        );

        const message = [
            '📋 Histórico de registros de hoje',
            '',
            ...lines,
            '',
            `💧 Total: ${total.toLocaleString(
                'pt-BR',
            )} ml`,
            `📝 Registros: ${entries.length}`,
        ].join('\n');

        await this.notificationsService.sendTelegram(
            message,
        );
    }

    private async sendAiAnalysis(
        userId: number,
        userMessage: string,
    ): Promise<void> {
        await this.notificationsService.sendTelegram(
            '🤖 Analisando seus dados de hidratação...',
        );

        const entries =
            (await this.waterEntriesService.findToday(
                userId,
            )) as WaterEntry[];

        const normalizedEntries = (
            entries ?? []
        ).map((entry) => ({
            amountMl: Number(entry.amount_ml),
            consumedAt: entry.consumed_at,
        }));

        let consumedMl =
            normalizedEntries.reduce(
                (total, entry) =>
                    total + entry.amountMl,
                0,
            );

        let dailyGoalMl: number | null = null;
        let remainingMl: number | null = null;
        let percentage: number | null = null;

        try {
            const progress =
                await this.hydrationGoalsService.getProgress(
                    userId,
                );

            consumedMl = Number(
                progress.today.consumedMl,
            );

            dailyGoalMl = Number(
                progress.goal.dailyAmountMl,
            );

            remainingMl = Number(
                progress.today.remainingMl,
            );

            percentage = Number(
                progress.today.percentage,
            );
        } catch {
            this.logger.warn(
                `Usuário ${userId} ainda não possui uma meta ativa.`,
            );
        }

        const answer =
            await this.hydrationAiService.askQuestion(
                userMessage,
                {
                    consumedMl,
                    dailyGoalMl,
                    remainingMl,
                    percentage,
                    entries: normalizedEntries,
                },
            );

        await this.notificationsService.sendTelegram(
            [
                '🤖 Análise da sua hidratação',
                '',
                answer,
            ].join('\n'),
        );
    }

    private async sendWeeklyAiAnalysis(
        userId: number,
    ): Promise<void> {
        await this.notificationsService.sendTelegram(
            '🤖 Analisando seu histórico dos últimos 7 dias com IA...',
        );

        const entries = await this.waterEntriesService.findLast7Days(
            userId,
        );

        const normalizedEntries = entries.map((entry) => ({
            amountMl: Number(entry.amount_ml),
            consumedAt: entry.consumed_at,
        }));

        let dailyGoalMl: number | null = null;

        try {
            const progress =
                await this.hydrationGoalsService.getProgress(
                    userId,
                );

            dailyGoalMl = Number(
                progress.goal.dailyAmountMl,
            );
        } catch {
            this.logger.warn(
                `Usuário ${userId} ainda não possui uma meta ativa.`,
            );
        }

        const answer =
            await this.hydrationAiService.analyze7DaysHistory({
                dailyGoalMl,
                entries: normalizedEntries,
            });

        await this.notificationsService.sendTelegram(
            [
                '📊 Análise dos últimos 7 dias (IA)',
                '',
                answer,
            ].join('\n'),
        );
    }

    private async sendHelpMessage(): Promise<void> {
        const message = [
            '💧 Water Manager Bot',
            '',
            'Comandos disponíveis:',
            '',
            '• /beber 300 — Registrar 300 ml',
            '• /add 300 — Registrar 300 ml',
            '• 300 — Registrar 300 ml',
            '• /status — Ver o progresso do dia',
            '• /hoje — Ver o progresso do dia',
            '• /meta 2500 — Definir a meta diária',
            '• /historico — Ver os registros do dia',
            '• /ia como estou hoje? — Analisar os dados com IA',
            '• /semana — Análise dos últimos 7 dias com IA',
            '• /ajuda — Exibir esta ajuda',
        ].join('\n');

        await this.notificationsService.sendTelegram(
            message,
        );
    }

    async registerWebhook(
        appUrl: string,
    ): Promise<string> {
        const token =
            this.configService.get<string>(
                'TELEGRAM_BOT_TOKEN',
            );

        if (!token) {
            throw new Error(
                'TELEGRAM_BOT_TOKEN não configurado.',
            );
        }

        const normalizedAppUrl = appUrl.replace(
            /\/$/,
            '',
        );

        const webhookUrl =
            `${normalizedAppUrl}/api/telegram/webhook`;

        const url =
            `https://api.telegram.org/bot${token}/setWebhook` +
            `?url=${encodeURIComponent(webhookUrl)}`;

        const response = await fetch(url);

        const data = (await response.json()) as {
            ok?: boolean;
            description?: string;
        };

        if (!response.ok || data.ok === false) {
            throw new Error(
                data.description ||
                'Não foi possível configurar o webhook.',
            );
        }

        this.logger.log(
            `Resultado do setWebhook: ${JSON.stringify(
                data,
            )}`,
        );

        return (
            data.description ||
            'Webhook configurado'
        );
    }
}