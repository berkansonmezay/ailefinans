import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SavingsService } from "./savings.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("savings")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class SavingsController {
  constructor(private service: SavingsService) {}

  @Get("goals")
  async findAllGoals(@ActiveTenant() tenantId: string) {
    return success(await this.service.findAllGoals(tenantId));
  }

  @Get("goals/:id")
  async findOneGoal(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.findOneGoal(id, tenantId));
  }

  @Post("goals")
  async createGoal(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.createGoal(tenantId, user.userId, dto),
      "Hedef oluşturuldu.",
    );
  }

  @Put("goals/:id")
  async updateGoal(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @Body() dto: any,
  ) {
    return success(
      await this.service.updateGoal(id, tenantId, dto),
      "Hedef güncellendi.",
    );
  }

  @Post("goals/:id/transactions")
  async addTransaction(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.addTransaction(id, tenantId, user.userId, dto),
      dto.type === "DEPOSIT" ? "Birikim eklendi." : "Birikim çekildi.",
    );
  }

  @Delete("goals/:id")
  async removeGoal(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(
      await this.service.removeGoal(id, tenantId),
      "Hedef silindi.",
    );
  }
}
