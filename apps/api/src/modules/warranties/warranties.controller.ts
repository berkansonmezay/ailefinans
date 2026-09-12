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
import { WarrantiesService } from "./warranties.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success, paginated } from "../../common/helpers";

@Controller("warranties")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class WarrantiesController {
  constructor(private service: WarrantiesService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string, @Query() query: any) {
    const r = await this.service.findAll(tenantId, query);
    return paginated(r.data, r.total, r.page, r.pageSize);
  }

  @Post()
  async create(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.create(tenantId, user.userId, dto),
      "Garanti kaydı oluşturuldu.",
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
      "Garanti kaydı güncellendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(
      await this.service.remove(id, tenantId),
      "Garanti kaydı silindi.",
    );
  }
}
