import { Test, TestingModule } from '@nestjs/testing';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';

describe('StagesController', () => {
  let controller: StagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StagesController],
      providers: [{ provide: StagesService, useValue: {} }],
    }).compile();

    controller = module.get<StagesController>(StagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
