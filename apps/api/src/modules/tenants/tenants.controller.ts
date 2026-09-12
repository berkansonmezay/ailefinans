import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TenantsService } from "./tenants.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("tenants")
@UseGuards(AuthGuard("jwt"))
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    const tenants = await this.tenantsService.getUserTenants(user.userId);
    return success(tenants);
  }

  @Get(":tenantId")
  async get(@Param("tenantId") tenantId: string, @CurrentUser() user: any) {
    const tenant = await this.tenantsService.getTenant(tenantId, user.userId);
    return success(tenant);
  }

  @Post()
  async createTenant(
    @CurrentUser() user: any,
    @Body() dto: { name: string; currency?: string },
  ) {
    const tenant = await this.tenantsService.createTenant(user.userId, dto);
    return success(tenant, "Yeni kurum oluşturuldu.");
  }

  @Delete(":tenantId")
  async deleteTenant(
    @Param("tenantId") tenantId: string,
    @CurrentUser() user: any,
  ) {
    await this.tenantsService.deleteTenant(tenantId, user.userId);
    return success(null, "Kurum başarıyla silindi.");
  }

  @Put(":tenantId")
  async update(
    @Param("tenantId") tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: { name?: string; currency?: string },
  ) {
    const tenant = await this.tenantsService.updateTenant(
      tenantId,
      user.userId,
      dto,
    );
    return success(tenant, "Aile bilgileri güncellendi.");
  }

  @Post(":tenantId/members")
  async addMember(
    @Param("tenantId") tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: { email: string; role: string },
  ) {
    const member = await this.tenantsService.addMember(
      tenantId,
      user.userId,
      dto,
    );
    return success(member, "Üye eklendi.");
  }

  @Delete(":tenantId/members/:memberUserId")
  async removeMember(
    @Param("tenantId") tenantId: string,
    @Param("memberUserId") memberUserId: string,
    @CurrentUser() user: any,
  ) {
    await this.tenantsService.removeMember(tenantId, user.userId, memberUserId);
    return success(null, "Üye çıkarıldı.");
  }
}
