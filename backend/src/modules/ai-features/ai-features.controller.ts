import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Public } from '../../common/decorators/public.decorator';
import { AiFeaturesService } from './ai-features.service';
import { CreateAiFeatureDto } from './dto/create-ai-feature.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateAiFeatureDto extends PartialType(CreateAiFeatureDto) {}

@Controller('ai-features')
export class AiFeaturesController {
  constructor(private readonly aiFeaturesService: AiFeaturesService) {}

  /** Public — org-facing AI plan pages need to resolve AI feature names */
  @Get()
  @Public()
  findAll(@Query('includeInactive') includeInactive?: string): Promise<any> {
    return this.aiFeaturesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string): Promise<any> {
    return this.aiFeaturesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  create(@Body() dto: CreateAiFeatureDto): Promise<any> {
    return this.aiFeaturesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateAiFeatureDto): Promise<any> {
    return this.aiFeaturesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  remove(@Param('id') id: string): Promise<any> {
    return this.aiFeaturesService.remove(id);
  }
}
