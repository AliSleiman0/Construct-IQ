import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { MongooseModule } from './database/mongoose/mongoose.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { OrgContextInterceptor } from './common/interceptors/org-context.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AiModule } from './modules/ai/ai.module';
import { IssuesModule } from './modules/issues/issues.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { BudgetModule } from './modules/budget/budget.module';
import { PlansModule } from './modules/plans/plans.module';
import { BillingModule } from './modules/billing/billing.module';
import { UnitsModule } from './modules/units/units.module';
import { SurveyorModule } from './modules/surveyor/surveyor.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    MongooseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    AiModule,
    IssuesModule,
    ReportsModule,
    TasksModule,
    AuditModule,
    NotificationsModule,
    TicketsModule,
    ProcurementModule,
    BudgetModule,
    PlansModule,
    BillingModule,
    UnitsModule,
    SurveyorModule,
    DocumentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OrgContextInterceptor,
    },
  ],
})
export class AppModule {}
