import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StocksService } from './stocks.service';
import { ActiveTenant } from '../../common/decorators';
import { TenantGuard } from '../../common/guards';
import { success } from '../../common/helpers';

@Controller('stocks')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class StocksController {
  constructor(private service: StocksService) {}

  @Get()
  async getPortfolio(@ActiveTenant() tenantId: string) {
    return success(await this.service.getPortfolio(tenantId));
  }

  @Get('summary')
  async getSummary(@ActiveTenant() tenantId: string) {
    return success(await this.service.getSummary(tenantId));
  }
  
  @Get('search')
  async searchStocks(@Query('q') query: string) {
    return success(await this.service.searchStocks(query));
  }

  @Get(':symbol/transactions')
  async getTransactions(
    @ActiveTenant() tenantId: string,
    @Param('symbol') symbol: string,
  ) {
    return success(await this.service.getTransactions(tenantId, symbol));
  }

  @Get(':symbol/quote')
  async getQuote(@Param('symbol') symbol: string) {
    return success(await this.service.getQuote(symbol));
  }

  @Post('buy')
  async buyStock(
    @ActiveTenant() tenantId: string,
    @Body() body: { symbol: string; quantity: number; price: number; date: string; notes?: string },
  ) {
    return success(await this.service.buyStock(tenantId, body));
  }

  @Post('sell')
  async sellStock(
    @ActiveTenant() tenantId: string,
    @Body() body: { symbol: string; quantity: number; price: number; date: string; notes?: string },
  ) {
    return success(await this.service.sellStock(tenantId, body));
  }

  @Put(':symbol')
  async updateAsset(
    @ActiveTenant() tenantId: string,
    @Param('symbol') symbol: string,
    @Body() body: { quantity: number; averageCost: number }
  ) {
    return success(await this.service.updateAsset(tenantId, symbol, body));
  }

  @Delete(':symbol')
  async deleteAsset(
    @ActiveTenant() tenantId: string,
    @Param('symbol') symbol: string
  ) {
    return success(await this.service.deleteAsset(tenantId, symbol));
  }
}
