import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)();

@Injectable()
export class CryptoService {
  constructor(private prisma: PrismaService) {}

  async searchCrypto(query: string) {
    if (!query || query.length < 2) return [];
    try {
      const results = await yahooFinance.search(query);
      return results.quotes.filter((q: any) => q.isYahooFinance && q.quoteType === 'CRYPTOCURRENCY').map((q: any) => ({
        symbol: q.symbol,
        shortname: q.shortname || q.longname,
        quoteType: q.quoteType,
        exchange: q.exchange,
      }));
    } catch (error) {
      console.warn('Crypto search failed:', error);
      return [];
    }
  }

  async getQuote(symbol: string) {
    try {
      const result = await yahooFinance.quote(symbol);
      return result;
    } catch (error) {
      console.warn(`Failed to fetch quote for ${symbol}:`, error);
      return null;
    }
  }

  async getPortfolio(tenantId: string) {
    const assets = await this.prisma.cryptoAsset.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { symbol: 'asc' },
    });

    const symbols = assets.map((a) => a.symbol);
    
    // Fetch quotes in parallel
    const quotes: any[] = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await yahooFinance.quote(symbol);
        } catch (error) {
          console.warn(`Failed to fetch quote for ${symbol}:`, error);
          return null;
        }
      })
    );

    const result = assets.map((asset) => {
      const quote = quotes.find((q: any) => q && q.symbol === asset.symbol);
      const currentPrice = quote?.regularMarketPrice || asset.averageCost;
      const totalValue = currentPrice * asset.quantity;
      const totalCost = asset.averageCost * asset.quantity;
      const pnlAmount = totalValue - totalCost;
      const pnlPercentage = totalCost > 0 ? (pnlAmount / totalCost) * 100 : 0;
      
      const shortName = quote?.shortName || asset.symbol.replace('-USD', '');

      return {
        ...asset,
        name: shortName,
        currentPrice,
        totalValue,
        totalCost,
        pnlAmount,
        pnlPercentage,
        marketState: quote?.marketState,
        regularMarketChange: quote?.regularMarketChange,
        regularMarketChangePercent: quote?.regularMarketChangePercent,
      };
    });

    return result;
  }

  async getSummary(tenantId: string) {
    const portfolio = await this.getPortfolio(tenantId);
    
    const totalValue = portfolio.reduce((sum, item) => sum + item.totalValue, 0);
    const totalCost = portfolio.reduce((sum, item) => sum + item.totalCost, 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPercentage = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercentage,
    };
  }

  async getTransactions(tenantId: string, symbol: string) {
    const asset = await this.prisma.cryptoAsset.findUnique({
      where: { tenantId_symbol: { tenantId, symbol } },
    });

    if (!asset) {
      throw new NotFoundException(`Crypto ${symbol} not found in your portfolio.`);
    }

    return this.prisma.cryptoTransaction.findMany({
      where: { tenantId, cryptoId: asset.id, deletedAt: null },
      orderBy: { date: 'desc' },
    });
  }

  async buyCrypto(tenantId: string, data: { symbol: string; quantity: number; price: number; date: string; notes?: string }) {
    if (data.quantity <= 0 || data.price <= 0) {
      throw new BadRequestException('Quantity and price must be greater than zero.');
    }

    const symbol = data.symbol.toUpperCase().trim();

    return this.prisma.$transaction(async (tx) => {
      let asset = await tx.cryptoAsset.findUnique({
        where: { tenantId_symbol: { tenantId, symbol } },
      });

      if (!asset) {
        asset = await tx.cryptoAsset.create({
          data: {
            tenantId,
            symbol,
            quantity: data.quantity,
            averageCost: data.price,
            currency: 'USD',
          },
        });
      } else {
        const totalValueOld = asset.quantity * asset.averageCost;
        const totalValueNew = data.quantity * data.price;
        const newQuantity = asset.quantity + data.quantity;
        const newAverageCost = (totalValueOld + totalValueNew) / newQuantity;

        asset = await tx.cryptoAsset.update({
          where: { id: asset.id },
          data: {
            quantity: newQuantity,
            averageCost: newAverageCost,
            deletedAt: null, // restore if deleted
          },
        });
      }

      await tx.cryptoTransaction.create({
        data: {
          tenantId,
          cryptoId: asset.id,
          type: 'BUY',
          quantity: data.quantity,
          price: data.price,
          date: new Date(data.date),
          notes: data.notes,
        },
      });

      return asset;
    });
  }

  async sellCrypto(tenantId: string, data: { symbol: string; quantity: number; price: number; date: string; notes?: string }) {
    if (data.quantity <= 0 || data.price <= 0) {
      throw new BadRequestException('Quantity and price must be greater than zero.');
    }

    const symbol = data.symbol.toUpperCase().trim();

    return this.prisma.$transaction(async (tx) => {
      let asset = await tx.cryptoAsset.findUnique({
        where: { tenantId_symbol: { tenantId, symbol } },
      });

      if (!asset || asset.quantity < data.quantity) {
        throw new BadRequestException('Not enough quantity to sell.');
      }

      const newQuantity = asset.quantity - data.quantity;
      
      asset = await tx.cryptoAsset.update({
        where: { id: asset.id },
        data: {
          quantity: newQuantity,
          // Average cost doesn't change on sell
          // Mark as deleted if quantity is basically zero to hide from portfolio
          deletedAt: newQuantity <= 0.000001 ? new Date() : null,
        },
      });

      await tx.cryptoTransaction.create({
        data: {
          tenantId,
          cryptoId: asset.id,
          type: 'SELL',
          quantity: data.quantity,
          price: data.price,
          date: new Date(data.date),
          notes: data.notes,
        },
      });

      return asset;
    });
  }

  async updateCrypto(tenantId: string, symbol: string, data: { quantity: number; averageCost: number }) {
    if (data.quantity < 0 || data.averageCost < 0) {
      throw new BadRequestException('Quantity and average cost must be positive.');
    }

    const asset = await this.prisma.cryptoAsset.findUnique({
      where: { tenantId_symbol: { tenantId, symbol: symbol.toUpperCase() } },
    });

    if (!asset) {
      throw new NotFoundException(`Crypto ${symbol} not found in your portfolio.`);
    }

    return this.prisma.cryptoAsset.update({
      where: { id: asset.id },
      data: {
        quantity: data.quantity,
        averageCost: data.averageCost,
        deletedAt: data.quantity <= 0.000001 ? new Date() : null,
      },
    });
  }

  async deleteCrypto(tenantId: string, symbol: string) {
    const asset = await this.prisma.cryptoAsset.findUnique({
      where: { tenantId_symbol: { tenantId, symbol: symbol.toUpperCase() } },
    });

    if (!asset) {
      throw new NotFoundException(`Crypto ${symbol} not found in your portfolio.`);
    }

    return this.prisma.cryptoAsset.update({
      where: { id: asset.id },
      data: {
        deletedAt: new Date(),
        quantity: 0,
      },
    });
  }
}
