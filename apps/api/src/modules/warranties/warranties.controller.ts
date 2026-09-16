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

  // ========================
  // CORE WARRANTY CRUD
  // ========================

  @Get()
  async findAll(@ActiveTenant() tenantId: string, @Query() query: any) {
    const r = await this.service.findAll(tenantId, query);
    return paginated(r.data, r.total, r.page, r.pageSize);
  }

  @Get("stats")
  async getStats(@ActiveTenant() tenantId: string) {
    return success(await this.service.getStats(tenantId), "İstatistikler");
  }

  @Get("expiring")
  async getExpiring(@ActiveTenant() tenantId: string) {
    return success(
      await this.service.getExpiring(tenantId),
      "Süresi dolacak garantiler",
    );
  }

  @Get("claims")
  async getAllClaims(
    @ActiveTenant() tenantId: string,
    @Query() query: any,
  ) {
    const r = await this.service.getAllClaims(tenantId, query);
    return paginated(r.data, r.total, r.page, r.pageSize);
  }

  @Get("services")
  async getAllServices(
    @ActiveTenant() tenantId: string,
    @Query() query: any,
  ) {
    const r = await this.service.getAllServices(tenantId, query);
    return paginated(r.data, r.total, r.page, r.pageSize);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
  ) {
    return success(
      await this.service.findOne(id, tenantId),
      "Garanti detayı",
    );
  }

  @Get(":id/timeline")
  async getTimeline(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
  ) {
    return success(
      await this.service.getTimeline(id, tenantId),
      "Zaman çizelgesi",
    );
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

  // ========================
  // WARRANTY EXTENSIONS
  // ========================

  @Post(":id/extend")
  async extendWarranty(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.extendWarranty(id, tenantId, user.userId, dto),
      "Garanti uzatıldı.",
    );
  }

  @Get(":id/extensions")
  async getExtensions(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
  ) {
    return success(
      await this.service.getExtensions(id, tenantId),
      "Uzatma geçmişi",
    );
  }

  // ========================
  // WARRANTY CLAIMS
  // ========================

  @Post(":id/claims")
  async createClaim(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.createClaim(id, tenantId, user.userId, dto),
      "Garanti talebi oluşturuldu.",
    );
  }

  @Put(":id/claims/:claimId")
  async updateClaimStatus(
    @Param("id") id: string,
    @Param("claimId") claimId: string,
    @ActiveTenant() tenantId: string,
    @Body() dto: any,
  ) {
    return success(
      await this.service.updateClaimStatus(id, claimId, tenantId, dto),
      "Talep durumu güncellendi.",
    );
  }

  @Get(":id/claims")
  async getClaims(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
  ) {
    return success(
      await this.service.getClaims(id, tenantId),
      "Talep geçmişi",
    );
  }

  // ========================
  // SERVICE RECORDS
  // ========================

  @Post(":id/services")
  async addServiceRecord(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return success(
      await this.service.addServiceRecord(id, tenantId, user.userId, dto),
      "Servis kaydı eklendi.",
    );
  }

  @Get(":id/services")
  async getServiceHistory(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
  ) {
    return success(
      await this.service.getServiceHistory(id, tenantId),
      "Servis geçmişi",
    );
  }
}
