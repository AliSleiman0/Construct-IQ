import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Public } from '../../common/decorators/public.decorator';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}

@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  /** Public — org-facing plan pages need to resolve feature names */
  @Get()
  @Public()
  findAll(@Query('includeInactive') includeInactive?: string): Promise<any> {
    return this.featuresService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string): Promise<any> {
    return this.featuresService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  create(@Body() dto: CreateFeatureDto): Promise<any> {
    return this.featuresService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateFeatureDto): Promise<any> {
    return this.featuresService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ALL)
  remove(@Param('id') id: string): Promise<any> {
    return this.featuresService.remove(id);
  }
}
