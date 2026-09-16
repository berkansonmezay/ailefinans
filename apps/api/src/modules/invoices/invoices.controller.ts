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
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { InvoicesService } from "./invoices.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success, paginated } from "../../common/helpers";

@Controller("invoices")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class InvoicesController {
  constructor(private service: InvoicesService) {}

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
      "Fatura oluşturuldu.",
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
      "Fatura güncellendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.remove(id, tenantId), "Fatura silindi.");
  }

  @Post("extract")
  @UseInterceptors(FileInterceptor("file"))
  async extractData(
    @ActiveTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("documentType") documentType: string,
  ) {
    if (!file) {
      return success(null, "No file uploaded");
    }
    const extractedData = await this.service.extractData(file, documentType);
    return success(extractedData, "Fatura verileri çıkarıldı.");
  }
}
