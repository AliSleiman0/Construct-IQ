import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { seesAllProjects } from '../../common/util/project-scope.util';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DOCUMENTS.READ)
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string, @Query('type') type?: string): Promise<any> {
    const orgWide = seesAllProjects(user.isSuperAdmin, user.permissions, 'documents');
    return this.documentsService.findAll(user.organizationId, user.isSuperAdmin, projectId, type, {
      userId: user.sub,
      orgWide,
    });
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DOCUMENTS.UPLOAD)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDocumentDto): Promise<any> {
    return this.documentsService.create(user.organizationId, user.sub, dto);
  }

  // Multipart file upload → S3 → Document record. Returns 503 if storage is
  // unconfigured (S3Service), 400 on missing/oversized/disallowed files.
  @Post('upload')
  @RequirePermissions(PERMISSIONS.DOCUMENTS.UPLOAD)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: any,
    @Body() dto: UploadDocumentDto,
  ): Promise<any> {
    return this.documentsService.uploadAndCreate(user.organizationId, user.sub, file, dto);
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
