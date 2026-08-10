import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigin = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && (!corsOrigin || corsOrigin.length === 0)) {
    throw new Error('CORS_ORIGIN must be set in production');
  }

  app.enableCors({
    origin: corsOrigin && corsOrigin.length > 0 ? corsOrigin : true,
    credentials: true,
  });

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (!isProd && process.env.SWAGGER_ENABLED !== 'false');

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('FlowAI API')
      .setDescription(
        '个人 MVP：鉴权、任务看板、笔记、附件与 AI。受保护接口使用 Bearer Access Token。',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log('Swagger UI enabled at /api/docs');
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`FlowAI API listening on http://0.0.0.0:${port}/api`);
  if (!corsOrigin?.length) {
    logger.warn('CORS_ORIGIN is unset; reflecting request origin (dev only)');
  }
}
void bootstrap();
