import { Test, TestingModule } from '@nestjs/testing';
import { WaterEntriesService } from './water-entries.service';

describe('WaterEntriesService', () => {
  let service: WaterEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WaterEntriesService],
    }).compile();

    service = module.get<WaterEntriesService>(WaterEntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
