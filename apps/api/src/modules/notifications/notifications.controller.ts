import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { NotificationsService } from "./notifications.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("notifications")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  async findAll(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    const result = await this.service.findAll(tenantId, user.userId, query);
    return success(result);
  }

  @Put("read-all")
  async markAllAsRead(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    await this.service.markAllAsRead(tenantId, user.userId);
    return success(null, "Tüm bildirimler okundu olarak işaretlendi.");
  }

  @Put(":id/read")
  async markAsRead(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    await this.service.markAsRead(id, tenantId, user.userId);
    return success(null, "Bildirim okundu olarak işaretlendi.");
  }
}
