import { Controller, Get, Put, Delete, Post, Param, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from "@nestjs/passport";
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators';

@Controller('admin')
@UseGuards(AuthGuard("jwt"))
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  async getUsers(@CurrentUser('userId') userId: string) {
    const users = await this.adminService.getUsers(userId);
    return { success: true, data: users };
  }

  @Put('users/:id/approve')
  async approveUser(
    @CurrentUser('userId') adminId: string,
    @Param('id') userId: string
  ) {
    const user = await this.adminService.approveUser(adminId, userId);
    return { success: true, data: user };
  }

  @Delete('users/:id')
  async deleteUser(
    @CurrentUser('userId') adminId: string,
    @Param('id') userId: string
  ) {
    await this.adminService.deleteUser(adminId, userId);
    return { success: true, data: { message: 'User deleted' } };
  }

  @Put('users/:id/password')
  async changeUserPassword(
    @CurrentUser('userId') adminId: string,
    @Param('id') userId: string,
    @Body('password') password: string
  ) {
    if (!password || password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.');
    }
    await this.adminService.changeUserPassword(adminId, userId, password);
    return { success: true, data: { message: 'Şifre güncellendi' } };
  }

  @Post('users/:id/impersonate')
  async impersonateUser(
    @CurrentUser('userId') adminId: string,
    @Param('id') userId: string
  ) {
    const result = await this.adminService.impersonateUser(adminId, userId);
    return { success: true, data: result };
  }
}
