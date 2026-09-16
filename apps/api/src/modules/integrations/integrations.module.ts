import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { GoogleDriveService } from './google-drive.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class IntegrationsModule {}
