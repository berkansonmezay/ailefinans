import { Controller, Get, Delete, Req, Res, UseGuards, Query, HttpStatus } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { success } from '../../common/helpers';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly driveService: GoogleDriveService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('google-drive/status')
  async getStatus(@Req() req: any) {
    const tenantId = req.user.activeTenantId;
    return success(await this.driveService.getIntegrationStatus(tenantId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('google-drive/auth')
  async auth(@Req() req: any) {
    const tenantId = req.user.activeTenantId;
    const url = this.driveService.getAuthUrl(tenantId);
    return success({ url });
  }

  // Google callback is generally a redirect, might not carry JWT if cross-domain, 
  // but we can parse tenantId from 'state' param.
  @Get('google-drive/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state');
    }
    const tenantId = state;
    try {
      await this.driveService.handleCallback(code, tenantId);
      // Redirect back to frontend settings page
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings`);
    } catch (error) {
      console.error('Google Auth Error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?error=GoogleAuthFailed`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('google-drive')
  async disconnect(@Req() req: any) {
    const tenantId = req.user.activeTenantId;
    return success(await this.driveService.disconnect(tenantId));
  }
}
