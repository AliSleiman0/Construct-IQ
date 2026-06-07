import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Liveness/readiness probe for Docker `HEALTHCHECK` and the nginx upstream.
 * `@Public()` bypasses both global guards (JwtAuthGuard and IpAllowlistGuard,
 * which early-returns on public routes), so the probe never needs a token.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Service health + MongoDB connectivity' })
  check() {
    // Mongoose connection readyState: 1 === connected.
    const mongo = this.connection.readyState === 1 ? 'up' : 'down';
    return {
      status: mongo === 'up' ? 'ok' : 'degraded',
      mongo,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
