import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { PublicProjectsController } from './public-projects.controller';
import { PublicAutocadController } from './public-autocad.controller';
import { ApsModule } from '../aps/aps.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ApsModule, AuditModule, NotificationsModule],
  controllers: [
    ProjectsController,
    PhasesController,
    MilestonesController,
    PublicProjectsController,
    PublicAutocadController,
  ],
  providers: [ProjectsService, PhasesService, MilestonesService],
  exports: [ProjectsService, PhasesService, MilestonesService],
})
export class ProjectsModule {}
