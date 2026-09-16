import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, Query } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { AuthGuard } from '@nestjs/passport';
import { success } from '../../common/helpers';

@Controller('crypto')
@UseGuards(AuthGuard('jwt'))
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Get()
  async getPortfolio(@Req() req: any) {
    const data = await this.cryptoService.getPortfolio(req.user.activeTenantId);
    return success(data);
  }

  @Get('summary')
  async getSummary(@Req() req: any) {
    const data = await this.cryptoService.getSummary(req.user.activeTenantId);
    return success(data);
  }

  @Get('search')
  async searchCrypto(@Query('q') query: string) {
    const data = await this.cryptoService.searchCrypto(query);
    return success(data);
  }

  @Get(':symbol/quote')
  async getQuote(@Param('symbol') symbol: string) {
    const data = await this.cryptoService.getQuote(symbol);
    return success(data);
  }

  @Get(':symbol/transactions')
  async getTransactions(@Req() req: any, @Param('symbol') symbol: string) {
    const data = await this.cryptoService.getTransactions(req.user.activeTenantId, symbol);
    return success(data);
  }

  @Post('buy')
  async buyCrypto(@Req() req: any, @Body() body: { symbol: string; quantity: number; price: number; date: string; notes?: string }) {
    const data = await this.cryptoService.buyCrypto(req.user.activeTenantId, body);
    return success(data);
  }

  @Post('sell')
  async sellCrypto(@Req() req: any, @Body() body: { symbol: string; quantity: number; price: number; date: string; notes?: string }) {
    const data = await this.cryptoService.sellCrypto(req.user.activeTenantId, body);
    return success(data);
  }

  @Put(':symbol')
  async updateCrypto(@Req() req: any, @Param('symbol') symbol: string, @Body() body: { quantity: number; averageCost: number }) {
    const data = await this.cryptoService.updateCrypto(req.user.activeTenantId, symbol, body);
    return success(data);
  }

  @Delete(':symbol')
  async deleteCrypto(@Req() req: any, @Param('symbol') symbol: string) {
    const data = await this.cryptoService.deleteCrypto(req.user.activeTenantId, symbol);
    return success(data);
  }
}
