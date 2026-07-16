import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StrollsService } from './strolls.service';
import { Stroll } from './entities/stroll.entity';

describe('StrollsService', () => {
  let service: StrollsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrollsService,
        { provide: getModelToken(Stroll.name), useValue: {} },
      ],
    }).compile();

    service = module.get<StrollsService>(StrollsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
