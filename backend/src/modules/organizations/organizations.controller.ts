import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, ForbiddenException,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createId } from '@paralleldrive/cuid2';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../common/constants/permissions';
import { S3Service } from '../uploads/s3.service';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

class SetPlanDto {
  @IsOptional()
  @IsString()
  planId!: string | null;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly s3Service: S3Service,
  ) {}

  /** Super Admin only — list all organizations on the platform */
  @Get()
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  findAll(@CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can list all organizations');
    }
    return this.organizationsService.findAll();
  }

  /** Super Admin only — provision a new tenant */
  @Post()
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.MANAGE)
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.findById(id, user.organizationId, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.organizationsService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  /** Super Admin only — suspend / reactivate a tenant */
  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.MANAGE)
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto, @CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can change organization status');
    }
    return this.organizationsService.setActive(id, dto.isActive);
  }

  /** Assign a subscription plan. Super Admin: any org. Org Admin: own org only. */
  @Patch(':id/plan')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.UPDATE)
  setPlan(@Param('id') id: string, @Body() dto: SetPlanDto, @CurrentUser() user: JwtPayload) {
    if (!user.isSuperAdmin && user.organizationId !== id) {
      throw new ForbiddenException("You can only change your own organization's plan");
    }
    return this.organizationsService.setPlan(id, dto.planId ?? null);
  }

  /** Upload a logo image. Super Admin: any org. Org Admin: own org only. */
  @Post(':id/logo')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: LOGO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_LOGO_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Logo must be PNG, JPEG, or WebP'), false);
        }
      },
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!user.isSuperAdmin && user.organizationId !== id) {
      throw new ForbiddenException("You can only update your own organization's logo");
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const ext = file.mimetype.split('/')[1];
    const key = `org-logos/${id}/${createId()}.${ext}`;
    const url = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
    return this.organizationsService.setLogo(id, user.organizationId, url, user.isSuperAdmin);
  }

  @Get(':id/stats')
  @RequirePermissions(PERMISSIONS.ORGANIZATIONS.READ)
  getStats(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.getStats(id, user.organizationId, user.isSuperAdmin);
  }
}
