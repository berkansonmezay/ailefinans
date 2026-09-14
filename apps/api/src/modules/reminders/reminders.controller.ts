import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { CurrentUser, ActiveTenant } from '../../common/decorators';
import { TenantGuard } from '../../common/guards';
import { success } from '../../common/helpers';

@Controller('reminders')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  async create(@Body() createReminderDto: CreateReminderDto, @ActiveTenant() tenantId: string, @CurrentUser() user: any) {
    const result = await this.remindersService.create(createReminderDto, tenantId, user.userId);
    return success(result);
  }

  @Get()
  async findAll(@ActiveTenant() tenantId: string) {
    const result = await this.remindersService.findAll(tenantId);
    return success(result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ActiveTenant() tenantId: string) {
    const result = await this.remindersService.findOne(id, tenantId);
    return success(result);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateReminderDto: UpdateReminderDto, @ActiveTenant() tenantId: string) {
    const result = await this.remindersService.update(id, updateReminderDto, tenantId);
    return success(result);
  }

  @Post(':id/complete')
  async completeReminder(@Param('id') id: string, @ActiveTenant() tenantId: string) {
    const result = await this.remindersService.completeReminder(id, tenantId);
    return success(result);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ActiveTenant() tenantId: string) {
    const result = await this.remindersService.remove(id, tenantId);
    return success(result);
  }
}
