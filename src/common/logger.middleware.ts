import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, ip } = req;
        const userAgent = req.get('user-agent') || '-';
        const start = Date.now();

        if (['POST', 'PATCH', 'PUT'].includes(method) && req.body) {
            this.logger.log(
                `→ ${method} ${originalUrl} | Body: ${JSON.stringify(req.body)}`,
            );
        }

        res.on('finish', () => {
            const duration = Date.now() - start;
            const { statusCode } = res;

            const logLine = `${method} ${originalUrl} ${statusCode} — ${duration}ms | IP: ${ip} | UA: ${userAgent}`;

            if (statusCode >= 500) {
                this.logger.error(logLine);
            } else if (statusCode >= 400) {
                this.logger.warn(logLine);
            } else {
                this.logger.log(logLine);
            }
        });

        next();
    }
}
