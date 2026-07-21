import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WaterEntriesService } from '../water-entries/water-entries.service';
import { HydrationGoalsService } from '../hydration-goals/hydration-goals.service';
import { NotificationsService } from './notifications.service';

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

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly waterEntriesService: WaterEntriesService,
        private readonly hydrationGoalsService: HydrationGoalsService,
        private readonly notificationsService: NotificationsService,
    ) { }

    async handleUpdate(update: TelegramUpdate): Promise<void> {
        if (!update.message || !update.message.text) {
            return;
        }

        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        const userId = 1; // ID temporário padrão do sistema

        this.logger.log(`Mensagem recebida do Telegram (${chatId}): "${text}"`);

        try {
            // Comando /start, /ajuda, /help
            if (/^\/(start|help|ajuda)/i.test(text)) {
                await this.sendHelpMessage(chatId);
                return;
            }

            // Comando /status, /hoje, /progresso
            if (/^\/(status|hoje|progresso)/i.test(text)) {
                await this.sendStatusMessage(chatId, userId);
                return;
            }

            // Comando /historico, /history
            if (/^\/(historico|history)/i.test(text)) {
                await this.sendHistoryMessage(chatId, userId);
                return;
            }

            // Comando /meta [quantidade] ou /meta 3000
            const metaMatch = text.match(/^\/meta\s+(\d+)/i);
            if (metaMatch) {
                const amountMl = parseInt(metaMatch[1], 10);
                await this.setGoal(chatId, userId, amountMl);
                return;
            }

            // Comando /beber [quantidade], /add [quantidade], ou apenas um número (ex: 300, 300ml, +300)
            const beberMatch = text.match(/^(\/beber|\/add|\+)?\s*(\d+)\s*(ml)?$/i);
            if (beberMatch) {
                const amountMl = parseInt(beberMatch[2], 10);
                if (amountMl > 0 && amountMl <= 10000) {
                    await this.addWaterEntry(chatId, userId, amountMl);
                    return;
                }
            }

            // Comando não reconhecido
            await this.notificationsService.sendTelegram(
                '❓ Comando não reconhecido.\n\nDigite /ajuda para ver a lista de comandos disponíveis.',
            );
        } catch (error) {
            this.logger.error('Erro ao processar mensagem do Telegram:', error);
            await this.notificationsService.sendTelegram(
                '❌ Ocorreu um erro ao processar seu comando. Tente novamente em instantes.',
            );
        }
    }

    private async addWaterEntry(chatId: string | number, userId: number, amountMl: number): Promise<void> {
        await this.waterEntriesService.create(String(userId), amountMl);

        let progressInfo = '';
        try {
            const progress = await this.hydrationGoalsService.getProgress(userId);
            const { consumedMl, remainingMl, percentage } = progress.today;
            const dailyGoal = progress.goal.dailyAmountMl;

            progressInfo = [
                '',
                `💧 Consumido hoje: ${consumedMl.toLocaleString('pt-BR')} ml`,
                `🎯 Meta diária: ${dailyGoal.toLocaleString('pt-BR')} ml`,
                `📉 Restam: ${remainingMl.toLocaleString('pt-BR')} ml`,
                `📊 Progresso: ${percentage}%`,
                percentage >= 100 ? '\n🎉 Parabéns! Você atingiu sua meta diária!' : '',
            ].filter(Boolean).join('\n');
        } catch {
            const total = await this.waterEntriesService.getTodayTotal(userId);
            progressInfo = `\n💧 Consumido hoje: ${total.totalMl.toLocaleString('pt-BR')} ml`;
        }

        const message = `✅ *+${amountMl.toLocaleString('pt-BR')} ml* registrados com sucesso!${progressInfo}`;
        await this.notificationsService.sendTelegram(message);
    }

    private async sendStatusMessage(chatId: string | number, userId: number): Promise<void> {
        try {
            const progress = await this.hydrationGoalsService.getProgress(userId);
            const { consumedMl, remainingMl, percentage } = progress.today;
            const dailyGoal = progress.goal.dailyAmountMl;

            const message = [
                '📊 *Status de Hidratação de Hoje*',
                '',
                `💧 Consumido: ${consumedMl.toLocaleString('pt-BR')} ml`,
                `🎯 Meta diária: ${dailyGoal.toLocaleString('pt-BR')} ml`,
                `📉 Restam: ${remainingMl.toLocaleString('pt-BR')} ml`,
                `📊 Progresso: ${percentage}%`,
            ].join('\n');

            await this.notificationsService.sendTelegram(message);
        } catch {
            const total = await this.waterEntriesService.getTodayTotal(userId);
            await this.notificationsService.sendTelegram(
                `📊 Consumido hoje: *${total.totalMl.toLocaleString('pt-BR')} ml*\n\n(Defina uma meta usando /meta [ml] para ver seu progresso%)`,
            );
        }
    }

    private async setGoal(chatId: string | number, userId: number, dailyAmountMl: number): Promise<void> {
        try {
            const currentGoal = await this.hydrationGoalsService.findCurrent(userId);
            await this.hydrationGoalsService.update(currentGoal.id, userId, { dailyAmountMl });
        } catch {
            await this.hydrationGoalsService.create(userId, { dailyAmountMl });
        }

        await this.notificationsService.sendTelegram(
            `🎯 Nova meta de hidratação definida para *${dailyAmountMl.toLocaleString('pt-BR')} ml* por dia!`,
        );
    }

    private async sendHistoryMessage(chatId: string | number, userId: number): Promise<void> {
        const entries = await this.waterEntriesService.findToday(userId);

        if (!entries || entries.length === 0) {
            await this.notificationsService.sendTelegram('🏜️ Nenhum registro de consumo de água hoje.');
            return;
        }

        const lines = entries.map((e: any) => {
            const time = new Date(e.consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `• *${e.amount_ml} ml* às ${time}`;
        });

        const total = entries.reduce((acc: number, item: any) => acc + item.amount_ml, 0);

        const message = [
            '📋 *Histórico de Registros de Hoje*',
            '',
            ...lines,
            '',
            `💧 Total: *${total.toLocaleString('pt-BR')} ml* (${entries.length} registros)`,
        ].join('\n');

        await this.notificationsService.sendTelegram(message);
    }

    private async sendHelpMessage(chatId: string | number): Promise<void> {
        const message = [
            '💧 *Water Manager Bot*',
            '',
            'Comandos disponíveis:',
            '• `/beber 300` ou apenas `300` — Registrar consumo de água',
            '• `/status` ou `/hoje` — Ver progresso do dia',
            '• `/meta 2500` — Definir meta diária em ml',
            '• `/historico` — Ver registros do dia',
            '• `/ajuda` — Exibir este menu de ajuda',
        ].join('\n');

        await this.notificationsService.sendTelegram(message);
    }

    async registerWebhook(appUrl: string): Promise<string> {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN não configurado.');
        }

        const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
        const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

        const response = await fetch(url);
        const data = await response.json();

        this.logger.log(`Resultado do setWebhook: ${JSON.stringify(data)}`);
        return data.description || 'Webhook configurado';
    }
}
