// Plugin registration MUST run before any schema file loads — see init.ts
// for the rationale. Keep this `import './init'` as the first statement.
import './init';

import { Global, Module } from '@nestjs/common';
import { MongooseModule as NestMongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import { Role, RoleSchema } from '../../modules/users/schemas/role.schema';
import {
  Permission,
  PermissionSchema,
} from '../../modules/users/schemas/permission.schema';
import {
  Organization,
  OrganizationSchema,
} from '../../modules/organizations/schemas/organization.schema';
import {
  ChatSession,
  ChatSessionSchema,
} from '../../modules/ai/schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../../modules/ai/schemas/chat-message.schema';
import {
  Project,
  ProjectSchema,
} from '../../modules/projects/schemas/project.schema';
import { Phase, PhaseSchema } from '../../modules/projects/schemas/phase.schema';
import {
  Milestone,
  MilestoneSchema,
} from '../../modules/projects/schemas/milestone.schema';
import { Task, TaskSchema } from '../../modules/projects/schemas/task.schema';
import {
  DailyReport,
  DailyReportSchema,
} from '../../modules/reports/schemas/daily-report.schema';

const FEATURE_MODELS = NestMongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Role.name, schema: RoleSchema },
  { name: Permission.name, schema: PermissionSchema },
  { name: Organization.name, schema: OrganizationSchema },
  { name: ChatSession.name, schema: ChatSessionSchema },
  { name: ChatMessage.name, schema: ChatMessageSchema },
  { name: Project.name, schema: ProjectSchema },
  { name: Phase.name, schema: PhaseSchema },
  { name: Milestone.name, schema: MilestoneSchema },
  { name: Task.name, schema: TaskSchema },
  { name: DailyReport.name, schema: DailyReportSchema },
]);

/**
 * Global Mongoose module. Mirrors the previous @Global PrismaModule pattern:
 * one root connection + every model registered once and exported app-wide so
 * any service or guard can `@InjectModel(User.name)` without per-module
 * forFeature boilerplate. The schema files themselves carry the structural
 * contract (see *.schema.ts decorators).
 */
@Global()
@Module({
  imports: [
    NestMongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
      }),
    }),
    FEATURE_MODELS,
  ],
  exports: [FEATURE_MODELS],
})
export class MongooseModule {}
