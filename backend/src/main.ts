import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (hardening — spec §15 / M10)
  app.use(helmet());

  // gzip
  app.use(compression());

  // CORS — allow comma-separated list from env, default localhost dev origins
  const config = app.get(ConfigService);
  const origins = (config.get<string>('ALLOWED_ORIGINS') ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['healthz', 'readyz'] });
  const port = Number(config.get<string>('PORT') ?? '4000');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Biosyn CRM API listening on http://localhost:${port}/api`);
}
bootstrap();
