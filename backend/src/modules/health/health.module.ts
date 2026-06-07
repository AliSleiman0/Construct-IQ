import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Slim module exposing the public `GET /api/v1/health` probe. The Mongoose
 * connection is injected from the global MongooseModule — no forFeature needed.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
