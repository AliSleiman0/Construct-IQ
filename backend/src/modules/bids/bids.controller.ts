import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AiFeatureGuard } from '../../common/guards/ai-feature.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireAiFeature } from '../../common/decorators/require-ai-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { AI_FEATURES } from '../../common/constants/ai-features';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { BidsService } from './bids.service';
import { UploadBidsDto } from './dto/upload-bids.dto';
import { ListBidsQueryDto } from './dto/list-bids.query.dto';
import { IsString } from 'class-validator';

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

class AwardBidDto {
  @IsString()
  supplierId!: string;
}

@ApiTags('Bids')
@ApiCookieAuth()
@Controller('bids')
@UseGuards(JwtAuthGuard, PermissionsGuard, AiFeatureGuard)
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.BIDS.CREATE)
  @RequireAiFeature(AI_FEATURES.AI_BID_ANALYSIS.key)
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiOperation({
    summary: 'Upload subcontractor bid PDFs and extract structured data with AI',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files', 'projectId', 'tradePackage'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        projectId: { type: 'string' },
        tradePackage: { type: 'string' },
      },
    },
  })
  uploadAndExtract(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadBidsDto,
  ) {
    return this.bidsService.uploadAndExtract(
      user.organizationId,
      user.sub,
      user.isSuperAdmin,
      dto,
      files ?? [],
    );
  }

  @Get()
  @RequirePermissions(PERMISSIONS.BIDS.READ)
  @ApiOperation({ summary: 'List bids visible to the caller' })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListBidsQueryDto) {
    return this.bidsService.list(user.organizationId, user.isSuperAdmin, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BIDS.READ)
  @ApiOperation({ summary: 'Get a single bid by id' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bidsService.findOne(id, user.organizationId, user.isSuperAdmin);
  }

  @Post(':id/award')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS.CREATE)
  @ApiOperation({ summary: 'Award a bid — auto-creates a draft purchase order' })
  award(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AwardBidDto,
  ) {
    return this.bidsService.awardBid(id, user.organizationId, dto.supplierId, user.sub, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BIDS.DELETE)
  @ApiOperation({ summary: 'Soft-delete a bid (source document is retained in S3)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bidsService.remove(id, user.organizationId, user.isSuperAdmin);
  }
}
