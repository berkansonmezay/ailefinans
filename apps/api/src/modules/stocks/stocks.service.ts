import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)();

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio(tenantId: string) {
    const assets = await this.prisma.stockAsset.findMany({
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
      
      const shortName = quote?.shortName || asset.symbol.replace('.IS', '');

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
    const asset = await this.prisma.stockAsset.findUnique({
      where: { tenantId_symbol: { tenantId, symbol } },
    });

    if (!asset) {
      throw new NotFoundException(`Stock ${symbol} not found in your portfolio.`);
    }

    return this.prisma.stockTransaction.findMany({
      where: { tenantId, stockId: asset.id, deletedAt: null },
      orderBy: { date: 'desc' },
    });
  }

  async buyStock(tenantId: string, data: { symbol: string; quantity: number; price: number; date: string; notes?: string }) {
    if (data.quantity <= 0 || data.price <= 0) {
      throw new BadRequestException('Quantity and price must be greater than zero.');
    }

    const symbol = data.symbol.toUpperCase().trim();

    return this.prisma.$transaction(async (tx) => {
      let asset = await tx.stockAsset.findUnique({
        where: { tenantId_symbol: { tenantId, symbol } },
      });

      if (!asset) {
        asset = await tx.stockAsset.create({
          data: {
            tenantId,
            symbol,
            quantity: data.quantity,
            averageCost: data.price,
          },
        });
      } else {
        // Calculate new average cost
        const currentTotalCost = asset.quantity * asset.averageCost;
        const newCost = data.quantity * data.price;
        const newTotalQuantity = asset.quantity + data.quantity;
        const newAverageCost = (currentTotalCost + newCost) / newTotalQuantity;

        asset = await tx.stockAsset.update({
          where: { id: asset.id },
          data: {
            quantity: newTotalQuantity,
            averageCost: newAverageCost,
            deletedAt: null, // restore if it was deleted
          },
        });
      }

      await tx.stockTransaction.create({
        data: {
          tenantId,
          stockId: asset.id,
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

  async sellStock(tenantId: string, data: { symbol: string; quantity: number; price: number; date: string; notes?: string }) {
    if (data.quantity <= 0 || data.price <= 0) {
      throw new BadRequestException('Quantity and price must be greater than zero.');
    }

    const symbol = data.symbol.toUpperCase().trim();

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.stockAsset.findUnique({
        where: { tenantId_symbol: { tenantId, symbol } },
      });

      if (!asset || asset.quantity < data.quantity) {
        throw new BadRequestException(`You don't have enough ${symbol} shares to sell.`);
      }

      const newTotalQuantity = asset.quantity - data.quantity;

      // Note: Average cost doesn't change on sell, only quantity does.
      await tx.stockAsset.update({
        where: { id: asset.id },
        data: {
          quantity: newTotalQuantity,
          ...(newTotalQuantity === 0 ? { deletedAt: new Date() } : {}), // Soft delete if 0 shares
        },
      });

      await tx.stockTransaction.create({
        data: {
          tenantId,
          stockId: asset.id,
          type: 'SELL',
          quantity: data.quantity,
          price: data.price,
          date: new Date(data.date),
          notes: data.notes,
        },
      });

      return { success: true, remainingQuantity: newTotalQuantity };
    });
  }

  async searchStocks(query: string) {
      if (!query || query.length < 2) return [];
      try {
        const result: any = await yahooFinance.search(query);
        return result.quotes.filter((q: any) => q.quoteType === 'EQUITY');
      } catch (error) {
         console.error('Yahoo Finance Search Error:', error);
         return [];
      }
  }

  async getQuote(symbol: string) {
    try {
      let finalSymbol = symbol.trim().toUpperCase();
      if (!finalSymbol.includes('.')) {
        finalSymbol = `${finalSymbol}.IS`;
      }
      const quote = await yahooFinance.quote(finalSymbol);
      return quote;
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      return null;
    }
  }
  async updateAsset(tenantId: string, symbol: string, data: { quantity: number; averageCost: number }) {
    const asset = await this.prisma.stockAsset.findUnique({
      where: { tenantId_symbol: { tenantId, symbol: symbol.toUpperCase() } },
    });

    if (!asset) {
      throw new NotFoundException(`Stock ${symbol} not found.`);
    }

    return this.prisma.stockAsset.update({
      where: { id: asset.id },
      data: {
        quantity: data.quantity,
        averageCost: data.averageCost,
      },
    });
  }

  async deleteAsset(tenantId: string, symbol: string) {
    const asset = await this.prisma.stockAsset.findUnique({
      where: { tenantId_symbol: { tenantId, symbol: symbol.toUpperCase() } },
    });

    if (!asset) {
      throw new NotFoundException(`Stock ${symbol} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Soft delete transactions
      await tx.stockTransaction.updateMany({
        where: { stockId: asset.id },
        data: { deletedAt: new Date() },
      });

      // Soft delete asset
      return tx.stockAsset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
