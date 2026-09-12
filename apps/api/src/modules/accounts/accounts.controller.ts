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
import { AccountsService } from "./accounts.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success, paginated } from "../../common/helpers";

@Controller("accounts")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string, @Query() query: any) {
    const result = await this.service.findAll(tenantId, query);
    return paginated(result.data, result.total, result.page, result.pageSize);
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
      "Hesap oluşturuldu.",
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
      "Hesap güncellendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.remove(id, tenantId), "Hesap silindi.");
  }
}
