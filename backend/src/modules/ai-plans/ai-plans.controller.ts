import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { AiPlansService } from './ai-plans.service';
import { CreateAiPlanDto } from './dto/create-ai-plan.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Public } from '../../common/decorators/public.decorator';

class UpdateAiPlanDto extends PartialType(CreateAiPlanDto) {}

@Controller('ai-plans')
export class AiPlansController {
  constructor(private readonly aiPlansService: AiPlansService) {}

  /** Public for org-facing AI plan picker; pass includeInactive=true for super admin */
  @Get()
  @Public()
  findAll(@Query('includeInactive') includeInactive?: string): Promise<any> {
    return this.aiPlansService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string): Promise<any> {
    return this.aiPlansService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  create(@Body() dto: CreateAiPlanDto): Promise<any> {
    return this.aiPlansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateAiPlanDto): Promise<any> {
    return this.aiPlansService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  remove(@Param('id') id: string): Promise<any> {
    return this.aiPlansService.remove(id);
  }
}
