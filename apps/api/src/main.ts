import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

async function bootstrap() {
  // rawBody is required for payment webhook signature verification, which
  // must HMAC the exact raw bytes Paystack/Flutterwave sent - re-serializing
  // the parsed JSON would produce a different signature.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '1mb' });

  const corsOrigin = configService.get<string>('corsOrigin') ?? '';
  const allowedOrigins = corsOrigin.split(',').map((origin) => origin.trim());
  const nodeEnv = configService.get<string>('nodeEnv');

  if (nodeEnv === 'production' && allowedOrigins.some((origin) => origin.includes('localhost'))) {
    Logger.warn(
      `CORS_ORIGIN includes "localhost" in production (${corsOrigin}) - this is almost ` +
        'certainly a misconfiguration.',
      'Bootstrap',
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('port') ?? 4000;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

await bootstrap();
