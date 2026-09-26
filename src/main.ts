// Must run before any other import — @WebSocketGateway()'s cors option is evaluated
// as a decorator at module-load time, before ConfigModule.forRoot() would otherwise
// populate process.env, so realtime.gateway.ts needs it already loaded by then.
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Swagger UI's inline scripts/styles need a relaxed CSP, so scope the global
  // helmet() (which defaults to a strict CSP) off for /api/docs and apply a
  // no-CSP helmet there instead — still gets the other headers (nosniff,
  // frame-ancestors, etc.), just not the script/style restrictions Swagger trips.
  app.use('/api/docs', helmet({ contentSecurityPolicy: false }));
  app.use(helmet());

  app.enableCors({ origin: config.get<string>('frontendOrigin'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bilingual Content CMS API')
    .setDescription('API for managing bilingual (English/Arabic) articles, users and auth')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Deliberately public, no auth — showing clean API design is part of the
  // point of this portfolio project. See RED_TEAM_REPORT.md decision #4 if
  // that ever needs to change (e.g. once real user data flows through it).
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') || 3001;
  // Explicit host: Render (and most PaaS free tiers) route to the container
  // over its internal network interface, not just loopback.
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}, docs at /api/docs`);
}

bootstrap();
