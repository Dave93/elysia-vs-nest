import { NestFactory } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false }), {
  logger: false,
});
app.useGlobalPipes(new StandardSchemaValidationPipe({ validateCustomDecorators: true }));
await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
