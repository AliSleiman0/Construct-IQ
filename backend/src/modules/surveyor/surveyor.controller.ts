import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { SurveyorService } from './surveyor.service';
import {
  CreateBoqItemDto,
  CreateVariationDto,
  UpdateVariationDto,
  CreateValuationDto,
  UpdateValuationDto,
} from './dto/create-surveyor.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateBoqItemDto extends PartialType(CreateBoqItemDto) {}

@Controller('boq')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoqController {
  constructor(private readonly surveyorService: SurveyorService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BUDGET.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string): Promise<any> {
    return this.surveyorService.findAllBoq(user.organizationId, user.isSuperAdmin, projectId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBoqItemDto): Promise<any> {
    return this.surveyorService.createBoqItem(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateBoqItemDto): Promise<any> {
    return this.surveyorService.updateBoqItem(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.surveyorService.deleteBoqItem(id, user.organizationId, user.isSuperAdmin);
  }
}

@Controller('variations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VariationsController {
  constructor(private readonly surveyorService: SurveyorService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BUDGET.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string): Promise<any> {
    return this.surveyorService.findAllVariations(user.organizationId, user.isSuperAdmin, projectId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVariationDto): Promise<any> {
    return this.surveyorService.createVariation(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateVariationDto): Promise<any> {
    return this.surveyorService.updateVariation(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.surveyorService.approveVariation(id, user.organizationId, user.sub, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.surveyorService.deleteVariation(id, user.organizationId, user.isSuperAdmin);
  }
}

@Controller('valuations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ValuationsController {
  constructor(private readonly surveyorService: SurveyorService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BUDGET.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string): Promise<any> {
    return this.surveyorService.findAllValuations(user.organizationId, user.isSuperAdmin, projectId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateValuationDto): Promise<any> {
    return this.surveyorService.createValuation(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateValuationDto): Promise<any> {
    return this.surveyorService.updateValuation(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Post(':id/certify')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  certify(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.surveyorService.certifyValuation(id, user.organizationId, user.sub, user.isSuperAdmin);
  }
}
