import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { PublicProjectsController } from './public-projects.controller';

@Module({
  controllers: [ProjectsController, PhasesController, MilestonesController, PublicProjectsController],
  providers: [ProjectsService, PhasesService, MilestonesService],
  exports: [ProjectsService, PhasesService, MilestonesService],
})
export class ProjectsModule {}
