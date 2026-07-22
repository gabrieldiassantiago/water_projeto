import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface HydrationAiContext {
    userMessage: string;
    consumedMl: number;
    dailyGoalMl: number | null;
    remainingMl: number | null;
    percentage: number | null;
    entries: Array<{
        amountMl: number;
        consumedAt: Date | string;
    }>;
}

@Injectable()
export class HydrationAiService {
    private readonly logger = new Logger(HydrationAiService.name);
    private readonly ai: GoogleGenAI;
    private readonly model: string;

    constructor(private readonly configService: ConfigService) {
        const apiKey =
            this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            throw new Error(
                'GEMINI_API_KEY não configurada.',
            );
        }

        this.ai = new GoogleGenAI({
            apiKey,
        });

        this.model =
            this.configService.get<string>('GEMINI_MODEL') ??
            'gemini-2.5-flash';
    }

    async analyzeHydration(
        context: HydrationAiContext,
    ): Promise<string> {
        const history =
            context.entries.length > 0
                ? context.entries
                    .map((entry) => {
                        const time = new Date(
                            entry.consumedAt,
                        ).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo',
                        });

                        return `- ${entry.amountMl} ml às ${time}`;
                    })
                    .join('\n')
                : 'Nenhum registro hoje.';

        const prompt = `
        Você é um assistente de hidratação dentro de um bot do Telegram.

        Regras:
        - Responda em português brasileiro.
        - Seja direto, amigável e breve.
        - Use somente os dados fornecidos.
        - Não invente informações.
        - Não faça diagnósticos médicos.
        - Não prescreva quantidades específicas de água.
        - Caso exista risco ou dúvida médica, recomende procurar um profissional de saúde.
        - Responda em até 700 caracteres.
        - Não use formatação Markdown complexa.

        Pergunta do usuário:
        ${context.userMessage}

        Dados de hoje:
        - Consumido: ${context.consumedMl} ml
        - Meta: ${context.dailyGoalMl !== null
                ? `${context.dailyGoalMl} ml`
                : 'não definida'
            }
        - Restante: ${context.remainingMl !== null
                ? `${context.remainingMl} ml`
                : 'não disponível'
            }
        - Progresso: ${context.percentage !== null
                ? `${context.percentage}%`
                : 'não disponível'
            }

        Histórico:
        ${history}
        `.trim();

        try {
            const response =
                await this.ai.models.generateContent({
                    model: this.model,
                    contents: prompt,
                });

            const answer = response.text?.trim();

            if (!answer) {
                throw new Error(
                    'O Gemini retornou uma resposta vazia.',
                );
            }

            return answer;
        } catch (error) {
            this.logger.error(
                'Erro ao consultar o Gemini',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            throw new InternalServerErrorException(
                'Não foi possível gerar a análise.',
            );
        }
    }
}