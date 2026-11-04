import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import request from 'supertest';
import { AchievementsController } from '../../modules/achievements/achievements.controller';
import { AchievementsService } from '../../modules/achievements/achievements.service';
import { AdventureResultsService } from '../../modules/achievements/adventure-results.service';
import { AdventuresController } from '../../modules/adventures/adventures.controller';
import { AdventuresService } from '../../modules/adventures/adventures.service';
import { EmailVerifiedGuard } from '../../modules/auth/guards/email-verified.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

describe('Adventure result Swagger schemas', () => {
	it.each([
		[AchievementsController, AdventuresController],
		[AdventuresController, AchievementsController]
	])('keeps distinct schemas with %p registered first', async (first, second) => {
		const warningSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
		const achievementsResults = [{ result: { id: 'result-1', completedStageCount: 2 }, stroll: null }];
		const adventureResult = {
			adventure: { id: 'adventure-1' },
			stroll: null,
			completedStageCount: 2,
			elapsedSeconds: 100,
			routeLengthKm: 1,
			correctAnswerCount: 1,
			totalStageCount: 2,
			solvedRiddleCount: 1,
			totalRiddleCount: 2,
			unresolvedRiddleCount: 1
		};
		const moduleRef = await Test.createTestingModule({
			controllers: [first, second],
			providers: [
				{ provide: AchievementsService, useValue: {} },
				{ provide: AdventureResultsService, useValue: { findAllForUser: jest.fn().mockResolvedValue(achievementsResults) } },
				{ provide: AdventuresService, useValue: { getResult: jest.fn().mockResolvedValue(adventureResult) } }
			]
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate: (context: { switchToHttp(): { getRequest(): { user: unknown } } }) => {
					context.switchToHttp().getRequest().user = { userId: 'user-1' };
					return true;
				}
			})
			.overrideGuard(EmailVerifiedGuard)
			.useValue({ canActivate: () => true })
			.compile();
		const app = moduleRef.createNestApplication();
		app.setGlobalPrefix('v1');
		try {
			await app.init();
			const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			const schemas = document.components!.schemas!;
			const achievementsSchema = document.paths['/v1/achievements/results'].get!.responses['200'];
			const adventureSchema = document.paths['/v1/adventures/{adventureId}/result'].get!.responses['200'];

			expect(achievementsSchema).toMatchObject({
				content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AchievementAdventureResultResponseDto' } } } }
			});
			expect(adventureSchema).toMatchObject({
				content: { 'application/json': { schema: { $ref: '#/components/schemas/AdventureResultResponseDto' } } }
			});
			expect(schemas.AchievementAdventureResultResponseDto).toEqual({
				type: 'object',
				properties: {
					result: { $ref: '#/components/schemas/CompletedAdventureResultDto' },
					stroll: { type: 'object', nullable: true, allOf: [{ $ref: '#/components/schemas/StrollResponseDto' }] }
				},
				required: ['result', 'stroll']
			});
			expect(Object.keys((schemas.CompletedAdventureResultDto as SchemaObject).properties!)).toEqual([
				'id', 'userId', 'strollId', 'adventureId', 'completedStageCount', 'elapsedSeconds', 'routeLengthKm', 'completedAt', 'createdAt'
			]);
			const adventure = schemas.AdventureResultResponseDto as SchemaObject;
			expect(adventure.properties).toMatchObject({
				adventure: { $ref: '#/components/schemas/AdventureResponseDto' },
				stroll: { nullable: true, allOf: [{ $ref: '#/components/schemas/StrollResponseDto' }] },
				completedStageCount: { type: 'number' },
				elapsedSeconds: { type: 'number' },
				routeLengthKm: { type: 'number' },
				correctAnswerCount: { type: 'number' },
				totalStageCount: { type: 'number' },
				solvedRiddleCount: { type: 'number' },
				totalRiddleCount: { type: 'number' },
				unresolvedRiddleCount: { type: 'number' }
			});
			expect(adventure.properties).not.toHaveProperty('result');
			expect(adventure.required).toEqual(Object.keys(adventure.properties!).filter((key) => key !== 'stroll'));
			expect(warningSpy.mock.calls.filter(([message]) => String(message).includes('Duplicate DTO'))).toEqual([]);

			const artifact = JSON.parse(readFileSync(join(__dirname, '../../../docs/openapi/backend.openapi.json'), 'utf8')) as OpenAPIObject;
			for (const path of ['/v1/achievements/results', '/v1/adventures/{adventureId}/result']) {
				expect(artifact.paths[path]).toEqual(document.paths[path]);
			}
			for (const name of [
				'AchievementAdventureResultResponseDto', 'CompletedAdventureResultDto', 'AdventureResultResponseDto',
				'AdventureResponseDto', 'StrollResponseDto', 'StrollMediaUrlsResponseDto', 'StrollPriceDto'
			]) {
				expect(schemas[name]).toBeDefined();
				expect(artifact.components!.schemas![name]).toEqual(schemas[name]);
			}

			await request(app.getHttpServer()).get('/v1/achievements/results').expect(200, achievementsResults);
			await request(app.getHttpServer()).get('/v1/adventures/adventure-1/result').expect(200, adventureResult);
		} finally {
			await app.close();
			warningSpy.mockRestore();
		}
	});
});
