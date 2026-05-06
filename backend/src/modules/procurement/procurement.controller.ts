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
import { ProcurementService } from './procurement.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

// ── Suppliers ──────────────────────────────────────────────────────────────

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SUPPLIERS.READ)
  findAll(@CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.findAllSuppliers(user.organizationId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SUPPLIERS.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupplierDto): Promise<any> {
    return this.procurementService.createSupplier(user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.findSupplierById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateSupplierDto): Promise<any> {
    return this.procurementService.updateSupplier(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.deleteSupplier(id, user.organizationId, user.isSuperAdmin);
  }
}

// ── Purchase Orders ────────────────────────────────────────────────────────

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string): Promise<any> {
    return this.procurementService.findAllPOs(user.organizationId, user.isSuperAdmin, projectId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePurchaseOrderDto): Promise<any> {
    return this.procurementService.createPO(user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.findPOById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.UPDATE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdatePurchaseOrderDto): Promise<any> {
    return this.procurementService.updatePO(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.APPROVE)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.approvePO(id, user.organizationId, user.sub, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.deletePO(id, user.organizationId, user.isSuperAdmin);
  }
}

// ── Deliveries ─────────────────────────────────────────────────────────────

@Controller('deliveries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveriesController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DELIVERIES.READ)
  findAll(@CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.findAllDeliveries(user.organizationId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DELIVERIES.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeliveryDto): Promise<any> {
    return this.procurementService.createDelivery(user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DELIVERIES.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.procurementService.findDeliveryById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DELIVERIES.UPDATE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateDeliveryDto): Promise<any> {
    return this.procurementService.updateDelivery(id, user.organizationId, dto, user.isSuperAdmin);
  }
}
