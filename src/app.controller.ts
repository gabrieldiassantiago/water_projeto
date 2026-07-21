import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly databaseService: DatabaseService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    const result = await this.databaseService.query('SELECT NOW()');

    return {
      postgres: 'ok',
      now: result.rows[0].now,
      timestamp: new Date(),
    };
  }
}
