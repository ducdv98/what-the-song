import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { createValidationPipe } from './common/validation.js';
import type { Env } from './config/env.validation.js';

/**
 * Everything main.ts applies to the app, factored out so the e2e tests run
 * against exactly the same pipeline as production.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const express = app as NestExpressApplication;

  // Behind Caddy: take the client IP and scheme from X-Forwarded-*. One hop.
  if (config.get('TRUST_PROXY', { infer: true })) express.set('trust proxy', 1);
  express.disable('x-powered-by');

  // Nothing this API accepts is more than a few hundred bytes.
  express.useBodyParser('json', { limit: '10kb' });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
}
