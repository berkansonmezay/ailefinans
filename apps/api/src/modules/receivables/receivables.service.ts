import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class ReceivablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.receivable.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: sortOrder },
        include: { payments: { orderBy: { paymentDate: "desc" } } },
      }),
      this.prisma.receivable.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async findOne(id: string, tenantId: string) {
    const rec = await this.prisma.receivable.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { payments: { orderBy: { paymentDate: "desc" } } },
    });
    if (!rec) throw new NotFoundException("Alacak kaydı bulunamadı.");
    return rec;
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.receivable.create({
      data: {
        tenantId,
        debtorName: dto.debtorName,
        amount: dto.amount,
        currency: dto.currency || "TRY",
        givenDate: new Date(dto.givenDate),
        expectedPaymentDate: dto.expectedPaymentDate
          ? new Date(dto.expectedPaymentDate)
          : null,
        remainingAmount: dto.amount,
        description: dto.description,
        createdBy: userId,
      },
      include: { payments: true },
    });
  }

  async addPayment(
    id: string,
    tenantId: string,
    userId: string,
    dto: { amount: number; paymentDate: string; notes?: string },
  ) {
    const rec = await this.findOne(id, tenantId);
    const paymentAmount = Number(dto.amount);
    const remaining = Number(rec.remainingAmount);

    if (paymentAmount > remaining) {
      throw new BadRequestException(
        "Ödeme tutarı kalan alacak tutarını geçemez.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.receivablePayment.create({
        data: {
          receivableId: id,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          notes: dto.notes,
          createdBy: userId,
        },
      });
      const newPaid = Number(rec.paidAmount) + paymentAmount;
      const newRemaining = remaining - paymentAmount;
      const status = newRemaining <= 0
        ? "PAID"
        : "PARTIALLY_PAID";

      return tx.receivable.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining <= 0 ? 0 : newRemaining,
          status,
        },
        include: { payments: { orderBy: { paymentDate: "desc" } } },
      });
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.receivable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
