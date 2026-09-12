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
import { EventsService } from "./events.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("events")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class EventsController {
  constructor(private service: EventsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string, @Query() query: any) {
    return success(await this.service.findAll(tenantId, query));
  }

  @Post()
  async create(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.create(tenantId, user.userId, dto),
      "Etkinlik oluşturuldu.",
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
      "Etkinlik güncellendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(
      await this.service.remove(id, tenantId),
      "Etkinlik silindi.",
    );
  }
}
