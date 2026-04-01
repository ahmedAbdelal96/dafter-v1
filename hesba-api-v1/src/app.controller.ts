import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService, HealthCheckResult } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Health Check',
    description: 'Returns server and database health status',
  })
  @ApiOkResponse({
    description: 'Health check result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-02-21T12:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        database: { type: 'string', example: 'connected' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  async getHealth(): Promise<HealthCheckResult> {
    return this.appService.getHealth();
  }
}
