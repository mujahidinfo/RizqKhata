import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const production = config.get('NODE_ENV', { infer: true }) === 'production';

  // JSON bodies are small (orders, forms); photos go through multipart uploads.
  app.useBodyParser('json', { limit: '1mb' });
  app.disable('x-powered-by');
  const proxies = config.get('TRUST_PROXY', { infer: true });
  if (proxies > 0) app.set('trust proxy', proxies);

  // A JSON API: forbid framing and sniffing, send no referrer, pin HTTPS.
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    next();
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    // The web app's refresh token travels as an httpOnly cookie (see auth.cookie.ts).
    credentials: true,
  });
  app.enableShutdownHooks();

  if (!production) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Rizq Khata API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
  }

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}
await bootstrap();
