import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService, HealthCheckResult } from './app.service';
import { RawResponse } from './common/decorators/raw-response.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @SkipThrottle()
  @RawResponse()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Returns raw server and database health status (intentional non-envelope response).',
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
