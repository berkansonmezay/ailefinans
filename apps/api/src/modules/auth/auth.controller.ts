import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { Public, CurrentUser } from "../../common/decorators";
import { success } from "../../common/helpers";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("register")
  async register(
    @Body()
    dto: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      tenantName: string;
    },
  ) {
    const result = await this.authService.register(dto);
    return success(result, "Kayıt başarılı.");
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: { identifier: string; password: string }) {
    const result = await this.authService.login(dto);
    return success(result, "Giriş başarılı.");
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: { refreshToken: string }) {
    const result = await this.authService.refresh(dto.refreshToken);
    return success(result, "Token yenilendi.");
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: { refreshToken: string }) {
    const result = await this.authService.logout(dto.refreshToken);
    return success(result);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("switch-tenant")
  @HttpCode(HttpStatus.OK)
  async switchTenant(
    @CurrentUser() user: any,
    @Body() dto: { tenantId: string },
  ) {
    const result = await this.authService.switchTenant(
      user.userId,
      dto.tenantId,
    );
    return success(result, "Aile değiştirildi.");
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me")
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: any) {
    const result = await this.authService.getProfile(user.userId);
    return success(result, "Profil bilgileri getirildi.");
  }

  @UseGuards(AuthGuard("jwt"))
  @Put("me")
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: { firstName?: string; lastName?: string; password?: string; username?: string },
  ) {
    const result = await this.authService.updateProfile(user.userId, dto);
    return success(result, "Profil başarıyla güncellendi.");
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: { email: string }) {
    const result = await this.authService.forgotPassword(dto.email);
    return success(result, result.message);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: { token: string; password: string }) {
    const result = await this.authService.resetPassword(dto.token, dto.password);
    return success(result, result.message);
  }
}
