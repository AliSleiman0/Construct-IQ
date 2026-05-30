import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ProjectsService } from './projects.service';

@Controller('public/projects')
@Public()
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':token')
  getPortalData(@Param('token') token: string) {
    return this.projectsService.getClientPortalData(token);
  }
}
