import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { TagsModule } from './tags/tags.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MediaModule } from './media/media.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Global default: 60 requests/minute per IP. Auth endpoints override this with a
    // stricter limit via @Throttle() — this default just protects everything else
    // (and the free-tier host itself) from being hammered.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    EventEmitterModule.forRoot(),
    // Powers UserCleanupService's daily stale-pending-account job. Only runs
    // while this process is up — there's no external cron on a local-only
    // dev server, so it fires on whatever schedule the app happens to be
    // running through, not necessarily exactly 3am every day.
    ScheduleModule.forRoot(),
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    TagsModule,
    ArticlesModule,
    RealtimeModule,
    MediaModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
