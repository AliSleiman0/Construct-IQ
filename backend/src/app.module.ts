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
import { IpAllowlistGuard } from './common/guards/ip-allowlist.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AiModule } from './modules/ai/ai.module';
import { IssuesModule } from './modules/issues/issues.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { RfisModule } from './modules/rfis/rfis.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { BudgetModule } from './modules/budget/budget.module';
import { PlansModule } from './modules/plans/plans.module';
import { AiPlansModule } from './modules/ai-plans/ai-plans.module';
import { BillingModule } from './modules/billing/billing.module';
import { UnitsModule } from './modules/units/units.module';
import { SurveyorModule } from './modules/surveyor/surveyor.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FeaturesModule } from './modules/features/features.module';
import { AiFeaturesModule } from './modules/ai-features/ai-features.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrgSettingsModule } from './modules/org-settings/org-settings.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { BidsModule } from './modules/bids/bids.module';
import { HealthModule } from './modules/health/health.module';

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
    InspectionsModule,
    RfisModule,
    ReportsModule,
    TasksModule,
    AuditModule,
    NotificationsModule,
    TicketsModule,
    ProcurementModule,
    BudgetModule,
    PlansModule,
    AiPlansModule,
    BillingModule,
    UnitsModule,
    SurveyorModule,
    DocumentsModule,
    FeaturesModule,
    AiFeaturesModule,
    DashboardModule,
    OrgSettingsModule,
    SupportTicketsModule,
    BidsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      // Registered AFTER JwtAuthGuard so `request.user` is populated.
      // Nest evaluates global guards in registration order.
      provide: APP_GUARD,
      useClass: IpAllowlistGuard,
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
