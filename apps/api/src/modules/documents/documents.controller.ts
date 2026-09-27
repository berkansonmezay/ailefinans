import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { DocumentsService } from "./documents.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("documents")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string) {
    return success(await this.service.findAll(tenantId));
  }

  @Get(":id/file")
  async getFile(
    @Param("id") id: string,
    @ActiveTenant() tenantId: string,
    @Res() res: Response,
  ) {
    const fileResult = await this.service.getFileStream(id, tenantId);
    if (fileResult.type === "REDIRECT") {
      return res.redirect(fileResult.url!);
    }

    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileResult.fileName)}"`);
    if (fileResult.mimeType) {
      res.setHeader("Content-Type", fileResult.mimeType);
    }
    fileResult.stream!.pipe(res);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async upload(
    @ActiveTenant() tenantId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return success(
      await this.service.create(tenantId, user.userId, file, body),
      "Dosya başarıyla yüklendi.",
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @ActiveTenant() tenantId: string) {
    return success(await this.service.remove(id, tenantId), "Belge silindi.");
  }
}
