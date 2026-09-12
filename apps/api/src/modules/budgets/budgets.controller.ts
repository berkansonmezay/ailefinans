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
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BudgetsService } from "./budgets.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("budgets")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class BudgetsController {
  constructor(private service: BudgetsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string, @Query('period') period: string) {
    return success(await this.service.findAll(tenantId, period));
  }

  @Post()
  async create(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.create(tenantId, user.userId, dto),
      "Bütçe oluşturuldu.",
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
      "Bütçe güncellendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(
      await this.service.remove(id, tenantId),
      "Bütçe silindi.",
    );
  }
}
