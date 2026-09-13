import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ReceivablesService } from "./receivables.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success, paginated } from "../../common/helpers";

@Controller("receivables")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class ReceivablesController {
  constructor(private service: ReceivablesService) {}

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
      "Alacak oluşturuldu.",
    );
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @Body() dto: any,
  ) {
    return success(
      await this.service.updatePlan(id, tenantId, dto),
      "Taksitli alacak güncellendi.",
    );
  }

  @Post(":id/payments")
  async addPayment(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.addPayment(id, tenantId, user.userId, dto),
      "Ödeme kaydedildi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.remove(id, tenantId), "Alacak silindi.");
  }
}
