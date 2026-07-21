import { Injectable, OnModuleInit } from '@nestjs/common';
import * as pg from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit {
    private pool: pg.Pool;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        this.pool = new pg.Pool({
            connectionString: this.configService.get<string>('DATABASE_URL'),
        });

        try {
            await this.pool.query('SELECT NOW()');
        } catch (e) {
            throw e;
        }
    }

    async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]) {
        return this.pool.query<T>(text, params);
    }
}
