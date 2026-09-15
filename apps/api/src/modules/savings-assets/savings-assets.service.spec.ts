import { Test, TestingModule } from '@nestjs/testing';
import { SavingsAssetsService } from './savings-assets.service';

describe('SavingsAssetsService', () => {
  let service: SavingsAssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavingsAssetsService],
    }).compile();

    service = module.get<SavingsAssetsService>(SavingsAssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
