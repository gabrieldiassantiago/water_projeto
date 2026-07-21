import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import * as telegramBotService from './telegram-bot.service';

@Controller('telegram')
export class TelegramController {
    constructor(private readonly telegramBotService: telegramBotService.TelegramBotService) { }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() update: telegramBotService.TelegramUpdate) {
        this.telegramBotService.handleUpdate(update).catch((err) => {
            console.error('Erro no processamento do webhook Telegram:', err);
        });

        return { ok: true };
    }

    @Get('setup-webhook')
    async setupWebhook(@Query('url') url?: string) {
        const targetUrl = url || 'https://water-projeto.onrender.com';
        const result = await this.telegramBotService.registerWebhook(targetUrl);
        return { message: result, webhookUrl: `${targetUrl}/api/telegram/webhook` };
    }
}
