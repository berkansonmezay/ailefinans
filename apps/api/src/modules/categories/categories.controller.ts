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
import { CategoriesService } from "./categories.service";
import { ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("categories")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  async findAll(
    @ActiveTenant() tenantId: string,
    @Query("type") type?: string,
  ) {
    return success(await this.service.findAll(tenantId, type));
  }

  @Post()
  async create(@ActiveTenant() tenantId: string, @Body() dto: any) {
    return success(
      await this.service.create(tenantId, dto),
      "Kategori oluşturuldu.",
    );
  }

  @Post("bulk")
  async createBulk(@ActiveTenant() tenantId: string, @Body() dtos: any[]) {
    const result = await this.service.createBulk(tenantId, dtos);
    return success(
      result,
      `${result.count} kategori başarıyla içe aktarıldı.`,
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
      "Kategori güncellendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(
      await this.service.remove(id, tenantId),
      "Kategori silindi.",
    );
  }
}
