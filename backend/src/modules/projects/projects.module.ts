import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  controllers: [ProjectsController, PhasesController, MilestonesController],
  providers: [ProjectsService, PhasesService, MilestonesService],
  exports: [ProjectsService, PhasesService, MilestonesService],
})
export class ProjectsModule {}
