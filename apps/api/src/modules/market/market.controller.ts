import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MarketService } from './market.service';
import { TenantGuard } from '../../common/guards';
import { success } from '../../common/helpers';

@Controller('market')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('rates')
  async getRates() {
    const rates = await this.marketService.getNormalizedRates();
    return success({ rates });
  }
}
