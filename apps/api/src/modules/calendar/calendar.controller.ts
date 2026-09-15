import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarService } from './calendar.service';
import { ActiveTenant } from '../../common/decorators';
import { TenantGuard } from '../../common/guards';
import { success } from '../../common/helpers';

@Controller('calendar')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class CalendarController {
  constructor(private service: CalendarService) {}

  @Get()
  async getCalendarItems(
    @ActiveTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return success(await this.service.getCalendarItems(tenantId, startDate, endDate));
  }

  @Get('summary')
  async getCalendarSummary(
    @ActiveTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return success(await this.service.getCalendarSummary(tenantId, startDate, endDate));
  }
}
