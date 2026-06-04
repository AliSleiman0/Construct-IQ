import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorator';
import { ProjectsService } from './projects.service';
import { ApsService } from '../aps/aps.service';

const ALLOWED_MIME = new Set([
  'application/acad',
  'image/vnd.dwg',
  'application/dxf',
  'application/octet-stream', // many DWG files arrive with this generic type
]);
const ALLOWED_EXT = new Set(['.dwg', '.dxf', '.dwt', '.dws']);
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — CAD files can be large

@Controller('public/autocad')
@Public()
export class PublicAutocadController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly apsService: ApsService,
  ) {}

  /** Returns a short-lived APS viewer access token for the browser SDK. */
  @Get('viewer-token')
  getViewerToken() {
    return this.apsService.getViewerToken();
  }

  /** Returns project info + list of uploaded drawings. */
  @Get(':token')
  getPortalData(@Param('token') token: string) {
    return this.projectsService.getAutocadPortalData(token);
  }

  /** Engineer uploads a DWG/DXF file. */
  @Post(':token/drawings')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async uploadDrawing(
    @Param('token') token: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    const mimeOk = ALLOWED_MIME.has(file.mimetype);
    const extOk = ALLOWED_EXT.has(ext);

    if (!mimeOk && !extOk) {
      throw new BadRequestException(
        'Only AutoCAD files are accepted (.dwg, .dxf, .dwt, .dws)',
      );
    }

    return this.projectsService.saveAutocadDrawing(token, {
      originalname: file.originalname,
      mimetype: file.mimetype || 'application/octet-stream',
      buffer: file.buffer,
      size: file.size,
    });
  }

  /** Polls APS translation status for a specific drawing. */
  @Get(':token/drawings/:drawingId/status')
  refreshStatus(
    @Param('token') token: string,
    @Param('drawingId') drawingId: string,
  ) {
    return this.projectsService.refreshDrawingTranslationStatus(token, drawingId);
  }

  // ── CAD Canvas (2D/3D drawing editor) ─────────────────────────────────────

  /** Load the canvas JSON for the CAD editor. */
  @Get(':token/canvas')
  loadCanvas(@Param('token') token: string) {
    return this.projectsService.loadCadDrawing(token);
  }

  /** Save the canvas JSON from the CAD editor (auto-save). */
  @Put(':token/canvas')
  saveCanvas(
    @Param('token') token: string,
    @Body('canvasJson') canvasJson: string,
  ) {
    if (!canvasJson) throw new BadRequestException('canvasJson is required');
    return this.projectsService.saveCadDrawing(token, canvasJson);
  }
}
