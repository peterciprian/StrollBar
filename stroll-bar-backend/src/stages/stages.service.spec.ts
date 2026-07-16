import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StagesService } from './stages.service';
import { Stage } from './entities/stage.entity';

describe('StagesService', () => {
  let service: StagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StagesService,
        { provide: getModelToken(Stage.name), useValue: {} },
      ],
    }).compile();

    service = module.get<StagesService>(StagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
