import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e: any) {
      dbStatus = 'error: ' + (e?.message || 'db unreachable');
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ping')
  async ping() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {}
    return 'pong';
  }
}
