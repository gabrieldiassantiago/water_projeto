import { Test, TestingModule } from '@nestjs/testing';
import { WaterEntriesController } from './water-entries.controller';

describe('WaterEntriesController', () => {
  let controller: WaterEntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaterEntriesController],
    }).compile();

    controller = module.get<WaterEntriesController>(WaterEntriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
