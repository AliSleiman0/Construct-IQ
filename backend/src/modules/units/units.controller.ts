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
import { UnitsService } from './units.service';
import { CreateUnitDto, CreatePaymentDto, CreateProgressPhotoDto } from './dto/create-unit.dto';
import { UnitStatus } from '../../common/enums';
import { PartialType } from '@nestjs/mapped-types';

class UpdateUnitDto extends PartialType(CreateUnitDto) {}
class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}

@Controller('units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string, @Query('status') status?: UnitStatus): Promise<any> {
    return this.unitsService.findAllUnits(user.organizationId, user.isSuperAdmin, projectId, status);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECTS.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUnitDto): Promise<any> {
    return this.unitsService.createUnit(user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.unitsService.findUnitById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateUnitDto): Promise<any> {
    return this.unitsService.updateUnit(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.unitsService.deleteUnit(id, user.organizationId, user.isSuperAdmin);
  }
}

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('buyerId') buyerId?: string, @Query('unitId') unitId?: string): Promise<any> {
    return this.unitsService.findPayments(user.organizationId, user.isSuperAdmin, buyerId, unitId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECTS.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto): Promise<any> {
    return this.unitsService.createPayment(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdatePaymentDto): Promise<any> {
    return this.unitsService.updatePayment(id, user.organizationId, dto, user.isSuperAdmin);
  }
}

@Controller('progress-photos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProgressPhotosController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECTS.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string): Promise<any> {
    return this.unitsService.findPhotos(user.organizationId, user.isSuperAdmin, projectId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DOCUMENTS.UPLOAD)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProgressPhotoDto): Promise<any> {
    return this.unitsService.createPhoto(user.organizationId, user.sub, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.unitsService.deletePhoto(id, user.organizationId, user.isSuperAdmin);
  }
}
