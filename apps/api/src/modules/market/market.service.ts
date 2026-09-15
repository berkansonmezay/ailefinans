import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  async getRates() {
    try {
      const response = await axios.get('https://finans.truncgil.com/v3/today.json', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch market rates', error);
      return {};
    }
  }

  async getNormalizedRates() {
    const rawRates = await this.getRates();
    const normalized: any[] = [];

    for (const [key, value] of Object.entries(rawRates)) {
      if (key === 'Update_Date' || !value || typeof value !== 'object') continue;

      const v = value as any;
      if (v.Type === 'Currency' || v.Type === 'Gold') {
        normalized.push({
          code: key,
          type: v.Type,
          buying: this.parseValue(v.Buying),
          selling: this.parseValue(v.Selling),
          change: v.Change
        });
      }
    }

    return normalized;
  }

  private parseValue(val: string): number {
    if (!val) return 0;
    // val can be "$4.311,26" or "48,6347"
    let clean = val.replace('$', '').replace(/\./g, '').replace(',', '.');
    return parseFloat(clean);
  }
}
