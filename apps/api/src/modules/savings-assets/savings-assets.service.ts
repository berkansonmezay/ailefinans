import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SavingsAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const assets = await this.prisma.savingsAsset.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        }
      }
    });

    return assets;
  }

  async findOne(tenantId: string, id: string) {
    const asset = await this.prisma.savingsAsset.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { transactions: { orderBy: { date: 'desc' } } }
    });

    if (!asset) {
      throw new NotFoundException('Varlık bulunamadı');
    }

    return asset;
  }

  async addTransaction(tenantId: string, data: any) {
    const { code, type, bank, transactionType, quantity, price, date, notes } = data;
    
    // Find or create asset
    let asset = await this.prisma.savingsAsset.findFirst({
      where: { tenantId, code, bank: bank || null, deletedAt: null }
    });

    if (!asset) {
      asset = await this.prisma.savingsAsset.create({
        data: {
          tenantId,
          code,
          type,
          bank: bank || null,
          quantity: 0,
          averageCost: 0,
          currency: 'TRY',
        }
      });
    }

    // Process transaction
    const parsedQuantity = parseFloat(quantity);
    const parsedPrice = parseFloat(price);

    await this.prisma.savingsAssetTransaction.create({
      data: {
        tenantId,
        assetId: asset.id,
        type: transactionType, // BUY or SELL
        quantity: parsedQuantity,
        price: parsedPrice,
        date: new Date(date),
        notes,
      }
    });

    // Recalculate average cost and quantity
    const allTransactions = await this.prisma.savingsAssetTransaction.findMany({
      where: { assetId: asset.id, deletedAt: null },
      orderBy: { date: 'asc' }
    });

    let newQuantity = 0;
    let totalCost = 0;

    for (const trx of allTransactions) {
      if (trx.type === 'BUY') {
        totalCost += trx.quantity * trx.price;
        newQuantity += trx.quantity;
      } else if (trx.type === 'SELL') {
        if (newQuantity > 0) {
          const avg = totalCost / newQuantity;
          totalCost -= trx.quantity * avg;
        }
        newQuantity -= trx.quantity;
      }
    }

    const newAvgCost = newQuantity > 0 ? totalCost / newQuantity : 0;

    const updatedAsset = await this.prisma.savingsAsset.update({
      where: { id: asset.id },
      data: {
        quantity: newQuantity,
        averageCost: newAvgCost
      },
      include: {
        transactions: { orderBy: { date: 'desc' } }
      }
    });

    return updatedAsset;
  }

  async updateAsset(tenantId: string, id: string, data: { quantity: number; averageCost: number }) {
    const asset = await this.prisma.savingsAsset.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!asset) {
      throw new NotFoundException('Varlık bulunamadı');
    }

    return this.prisma.savingsAsset.update({
      where: { id },
      data: {
        quantity: data.quantity,
        averageCost: data.averageCost
      }
    });
  }

  async deleteAsset(tenantId: string, id: string) {
    const asset = await this.prisma.savingsAsset.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!asset) {
      throw new NotFoundException('Varlık bulunamadı');
    }

    return this.prisma.savingsAsset.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }
}
