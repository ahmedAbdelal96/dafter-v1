import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLoggerService } from './logger/logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);

  app.use(
    helmet({
      // Allow cross-origin requests from browser frontends (Next.js, Expo web).
      // Without this, helmet's default same-origin CORP header blocks credentialed
      // API responses even when CORS is correctly configured.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Keep opener policy relaxed for dev convenience.
      crossOriginOpenerPolicy: false,
    }),
  );

  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsCredentialsRaw =
    configService.get<boolean | string>('CORS_CREDENTIALS', true);
  const corsCredentials =
    typeof corsCredentialsRaw === 'string'
      ? corsCredentialsRaw.toLowerCase() === 'true'
      : Boolean(corsCredentialsRaw);

  app.enableCors({
    // Use a function so localhost/127.0.0.1 dev setups behave consistently
    // with credentialed requests and preflight checks.
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'X-Lang',
      'X-Tenant-ID',
      'X-Company-Id',
      'X-Correlation-Id',
      'X-Request-Id',
    ],
  });

  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Log every incoming HTTP request/response globally.
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  const port = configService.get<number>('PORT', 9000);
  const host = configService.get<string>('HOST', '127.0.0.1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hesba API')
    .setDescription('Accounting and ledger management system')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'access-token',
    )
    // Compatibility aliases because controllers use mixed ApiBearerAuth() names.
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(`http://${host}:${port}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const shouldUseDefaultBinding = host === 'localhost';
  if (shouldUseDefaultBinding) {
    // Let Node choose the default binding when host is localhost.
    // This avoids IPv4/IPv6 mismatch issues in local setups where
    // clients can resolve localhost differently.
    await app.listen(port);
  } else {
    await app.listen(port, host);
  }

  const publicHost = shouldUseDefaultBinding ? 'localhost' : host;
  logger.log(
    `?? Hesba API running on http://${publicHost}:${port}`,
    'Bootstrap',
  );
  logger.log(
    `?? Swagger docs: http://${publicHost}:${port}/api/docs`,
    'Bootstrap',
  );
  logger.log(`?? API prefix: /${apiPrefix}`, 'Bootstrap');
  logger.log(
    `?? Environment: ${configService.get<string>('NODE_ENV', 'development')}`,
    'Bootstrap',
  );
}

bootstrap();
