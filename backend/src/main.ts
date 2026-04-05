import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const frontendUrl = configService.get<string>('app.frontendUrl');

  // Security middleware
  app.use(helmet());
  app.use(cookieParser());
  app.use(compression());

  // CORS — allows credentials (cookies) from frontend origin
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API versioned prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger — available only in non-production
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ConstructIQ API')
      .setDescription('AI Construction Management Platform — REST API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('app.port') ?? 4000;
  await app.listen(port);

  console.log(`🚀 ConstructIQ API running at http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production') {
    console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
