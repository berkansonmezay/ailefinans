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
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { DocumentsService } from "./documents.service";
import { CurrentUser, ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";
import { v4 as uuidv4 } from "uuid";

@Controller("documents")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get()
  async findAll(@ActiveTenant() tenantId: string) {
    return success(await this.service.findAll(tenantId));
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
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
