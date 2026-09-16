import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly oauth2Client;

  constructor(private prisma: PrismaService) {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || 'your-client-id';
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'your-client-secret';
    // When using NextJS API routes for redirect, it might be easier. For now we use backend URL.
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google-drive/callback';

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  getAuthUrl(tenantId: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email'],
      state: tenantId, 
    });
  }

  async handleCallback(code: string, tenantId: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    // Set credentials to get user email
    this.oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: this.oauth2Client, version: 'v2' });
    let email = '';
    try {
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || '';
    } catch (e) {
      this.logger.error('Failed to get user email from Google', e);
    }

    // Save tokens in the database
    await this.prisma.tenantIntegration.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'GOOGLE_DRIVE',
        }
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpires: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        metadata: { email },
        isActive: true,
      },
      create: {
        tenantId,
        provider: 'GOOGLE_DRIVE',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpires: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        metadata: { email },
        isActive: true,
      }
    });

    return { success: true, email };
  }

  async getDriveClient(tenantId: string) {
    const integration = await this.prisma.tenantIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'GOOGLE_DRIVE',
        }
      }
    });

    if (!integration || !integration.isActive || !integration.refreshToken) {
      return null;
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID || 'your-client-id',
      process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'your-client-secret',
      process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google-drive/callback'
    );

    client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.tokenExpires ? integration.tokenExpires.getTime() : null,
    });

    client.on('tokens', async (tokens) => {
      await this.prisma.tenantIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || integration.refreshToken,
          tokenExpires: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        }
      });
    });

    return google.drive({ version: 'v3', auth: client });
  }

  async uploadFile(tenantId: string, file: Express.Multer.File) {
    const drive = await this.getDriveClient(tenantId);
    if (!drive) throw new Error('Google Drive integration not active');

    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);

    const fileMetadata = {
      name: file.originalname,
    };

    const media = {
      mimeType: file.mimetype,
      body: stream,
    };

    const result = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    return result.data;
  }

  async disconnect(tenantId: string) {
    await this.prisma.tenantIntegration.deleteMany({
      where: {
        tenantId,
        provider: 'GOOGLE_DRIVE',
      }
    });
    return { success: true };
  }

  async getIntegrationStatus(tenantId: string) {
    const integration = await this.prisma.tenantIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'GOOGLE_DRIVE',
        }
      }
    });

    if (!integration) return { connected: false };
    
    let metadata: any = integration.metadata || {};
    return {
      connected: integration.isActive,
      email: metadata.email,
    };
  }
}
