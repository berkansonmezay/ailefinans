import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DebtsService } from "./debts.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success, paginated } from "../../common/helpers";

@Controller("debts")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class DebtsController {
  constructor(private service: DebtsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string, @Query() query: any) {
    const r = await this.service.findAll(tenantId, query);
    return paginated(r.data, r.total, r.page, r.pageSize);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.findOne(id, tenantId));
  }

  @Post()
  async create(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.create(tenantId, user.userId, dto),
      "Borç oluşturuldu ve taksitler eklendi.",
    );
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @Body() dto: any,
  ) {
    return success(
      await this.service.update(id, tenantId, dto),
      "Taksitli işlem güncellendi.",
    );
  }

  @Patch(":id/reminder")
  async toggleReminder(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body("status") status: boolean,
  ) {
    return success(
      await this.service.toggleReminder(id, tenantId, status, user.userId),
      "Hatırlatıcı durumu güncellendi."
    );
  }

  @Post(":debtId/installments/:installmentId/pay")
  async payInstallment(
    @Param("debtId") debtId: string,
    @Param("installmentId") installmentId: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.payInstallment(
        debtId,
        installmentId,
        tenantId,
        user.userId,
        dto,
      ),
      "Taksit ödemesi alındı.",
    );
  }

  @Post(":debtId/installments/:installmentId/unpay")
  async unpayInstallment(
    @Param("debtId") debtId: string,
    @Param("installmentId") installmentId: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return success(
      await this.service.unpayInstallment(
        debtId,
        installmentId,
        tenantId,
        user.userId,
      ),
      "Taksit ödemesi geri alındı.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.remove(id, tenantId), "Borç silindi.");
  }
}
