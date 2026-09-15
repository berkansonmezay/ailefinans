import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SavingsAssetsService } from './savings-assets.service';
import { ActiveTenant } from '../../common/decorators';
import { TenantGuard } from '../../common/guards';
import { success } from '../../common/helpers';

@Controller('savings-assets')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class SavingsAssetsController {
  constructor(private readonly savingsService: SavingsAssetsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string) {
    const data = await this.savingsService.findAll(tenantId);
    return success(data);
  }

  @Get(':id')
  async findOne(@ActiveTenant() tenantId: string, @Param('id') id: string) {
    const data = await this.savingsService.findOne(tenantId, id);
    return success(data);
  }

  @Post('transaction')
  async addTransaction(@ActiveTenant() tenantId: string, @Body() body: any) {
    const data = await this.savingsService.addTransaction(tenantId, body);
    return success(data);
  }

  @Put(':id')
  async updateAsset(
    @ActiveTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { quantity: number; averageCost: number }
  ) {
    const data = await this.savingsService.updateAsset(tenantId, id, body);
    return success(data);
  }

  @Delete(':id')
  async deleteAsset(
    @ActiveTenant() tenantId: string,
    @Param('id') id: string
  ) {
    const data = await this.savingsService.deleteAsset(tenantId, id);
    return success(data);
  }
}
