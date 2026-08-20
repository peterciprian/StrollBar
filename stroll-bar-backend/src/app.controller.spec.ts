import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
	let appController: AppController;

	beforeEach(async () => {
		const appServiceMock = {
			health: jest.fn(),
			databaseHealth: jest.fn(),
			storageHealth: jest.fn()
		};

		const app: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [{ provide: AppService, useValue: appServiceMock }]
		}).compile();

		appController = app.get<AppController>(AppController);
	});

	it('should be defined', () => {
		expect(appController).toBeDefined();
	});
});
