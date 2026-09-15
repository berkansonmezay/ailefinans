import { Module } from '@nestjs/common';
import { SavingsAssetsController } from './savings-assets.controller';
import { SavingsAssetsService } from './savings-assets.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SavingsAssetsController],
  providers: [SavingsAssetsService]
})
export class SavingsAssetsModule {}
