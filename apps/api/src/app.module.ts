import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { AssetsModule } from './assets/assets.module.js';
import { SameOriginMiddleware } from './common/same-origin.middleware.js';
import { validateEnv, type Env } from './config/env.validation.js';
import { typeormOptions } from './database/typeorm.options.js';
import { HealthModule } from './health/health.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';
import { StatsModule } from './stats/stats.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        typeormOptions(
          config.get('DATABASE_URL', { infer: true }),
          config.get('DB_MIGRATIONS_RUN', { infer: true }),
        ),
    }),
    // A generous global ceiling; the auth routes set a much tighter one.
    // In-memory per instance — behind several instances, swap in a shared
    // store (e.g. Redis) so limits apply across all of them.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    UsersModule,
    AuthModule,
    AssetsModule,
    StatsModule,
    LeaderboardModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SameOriginMiddleware).forRoutes('{*path}');
  }
}
