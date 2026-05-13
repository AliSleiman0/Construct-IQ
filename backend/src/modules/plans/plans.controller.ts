import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Public } from '../../common/decorators/public.decorator';

class UpdatePlanDto extends PartialType(CreatePlanDto) {}

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /** Public for org-facing plan picker; pass includeInactive=true for super admin */
  @Get()
  @Public()
  findAll(@Query('includeInactive') includeInactive?: string): Promise<any> {
    return this.plansService.findAll(includeInactive === 'true');
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  create(@Body() dto: CreatePlanDto): Promise<any> {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto): Promise<any> {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  remove(@Param('id') id: string): Promise<any> {
    return this.plansService.remove(id);
  }
}
