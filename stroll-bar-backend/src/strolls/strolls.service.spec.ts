import { Test, TestingModule } from '@nestjs/testing';
import { StrollsService } from './strolls.service';

describe('StrollsService', () => {
  let service: StrollsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrollsService],
    }).compile();

    service = module.get<StrollsService>(StrollsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
