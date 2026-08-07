import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors();

  // Validation pipe
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

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('POS Angkringan API')
    .setDescription('API dokumentasi untuk sistem POS Angkringan')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autentikasi dan manajemen token')
    .addTag('Users', 'Manajemen user dan kasir')
    .addTag('Roles', 'Manajemen role')
    .addTag('Permissions', 'Manajemen permission')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Start
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Application running on http://localhost:${port}`);
  logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
