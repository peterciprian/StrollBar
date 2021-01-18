import { Test, TestingModule } from '@nestjs/testing';
import { StrollsController } from './strolls.controller';
import { StrollsService } from './strolls.service';

describe('StrollsController', () => {
  let controller: StrollsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrollsController],
      providers: [StrollsService],
    }).compile();

    controller = module.get<StrollsController>(StrollsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
