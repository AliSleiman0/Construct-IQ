import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DOCUMENTS.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string, @Query('type') type?: string): Promise<any> {
    return this.documentsService.findAll(user.organizationId, user.isSuperAdmin, projectId, type);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DOCUMENTS.UPLOAD)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDocumentDto): Promise<any> {
    return this.documentsService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.documentsService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS.DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.documentsService.softDelete(id, user.organizationId, user.isSuperAdmin);
  }
}
