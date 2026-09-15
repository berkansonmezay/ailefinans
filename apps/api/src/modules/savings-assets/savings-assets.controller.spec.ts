import { Test, TestingModule } from '@nestjs/testing';
import { SavingsAssetsController } from './savings-assets.controller';

describe('SavingsAssetsController', () => {
  let controller: SavingsAssetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavingsAssetsController],
    }).compile();

    controller = module.get<SavingsAssetsController>(SavingsAssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
