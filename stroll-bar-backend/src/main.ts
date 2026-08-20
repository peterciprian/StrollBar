import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('v1');
	app.enableCors({
		origin: (process.env.CORS_ORIGINS ?? 'https://peterciprian.github.io').split(',')
	});
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true
		})
	);

	const swaggerConfig = new DocumentBuilder()
		.setTitle('StrollBar API')
		.setDescription('OpenAPI documentation for the StrollBar backend.')
		.setVersion('1.0.0')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				description: 'Paste a valid JWT access token.'
			},
			'bearer'
		)
		.build();
	const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
		deepScanRoutes: true
	});
	const openApiOutputPath = join(process.cwd(), 'docs', 'openapi', 'backend.openapi.json');
	mkdirSync(join(process.cwd(), 'docs', 'openapi'), { recursive: true });
	writeFileSync(openApiOutputPath, JSON.stringify(swaggerDocument, null, 2), 'utf8');
	SwaggerModule.setup('docs', app, swaggerDocument, {
		swaggerOptions: {
			persistAuthorization: true
		}
	});

	const port = Number(process.env.PORT ?? 3000);
	await app.listen(port);
}

void bootstrap();
