import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ALL)
  findAll(@CurrentUser() user: JwtPayload): Promise<any> {
    return this.billingService.findAll(user.organizationId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ALL)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvoiceDto): Promise<any> {
    return this.billingService.create(dto, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ALL)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateInvoiceDto): Promise<any> {
    return this.billingService.update(id, dto, user.organizationId, user.isSuperAdmin);
  }
}
