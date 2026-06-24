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
import {
  CadDrawing,
  CadDrawingSchema,
} from '../../modules/projects/schemas/cad-drawing.schema';
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
import {
  Issue,
  IssueSchema,
} from '../../modules/issues/schemas/issue.schema';
import {
  Inspection,
  InspectionSchema,
} from '../../modules/inspections/schemas/inspection.schema';
import {
  Rfi,
  RfiSchema,
} from '../../modules/rfis/schemas/rfi.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../../modules/audit/schemas/audit-log.schema';
import {
  Notification,
  NotificationSchema,
} from '../../modules/notifications/schemas/notification.schema';
import {
  Ticket,
  TicketSchema,
} from '../../modules/tickets/schemas/ticket.schema';
import {
  Supplier,
  SupplierSchema,
} from '../../modules/procurement/schemas/supplier.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../../modules/procurement/schemas/purchase-order.schema';
import {
  Delivery,
  DeliverySchema,
} from '../../modules/procurement/schemas/delivery.schema';
import {
  MaterialRequest,
  MaterialRequestSchema,
} from '../../modules/procurement/schemas/material-request.schema';
import {
  Budget,
  BudgetSchema,
} from '../../modules/budget/schemas/budget.schema';
import {
  BudgetLine,
  BudgetLineSchema,
} from '../../modules/budget/schemas/budget-line.schema';
import {
  Expense,
  ExpenseSchema,
} from '../../modules/budget/schemas/expense.schema';
import {
  DocumentEntity,
  DocumentEntitySchema,
} from '../../modules/documents/schemas/document.schema';
import {
  Plan,
  PlanSchema,
} from '../../modules/plans/schemas/plan.schema';
import {
  Invoice,
  InvoiceSchema,
} from '../../modules/billing/schemas/invoice.schema';
import {
  Unit,
  UnitSchema,
} from '../../modules/units/schemas/unit.schema';
import {
  Payment,
  PaymentSchema,
} from '../../modules/units/schemas/payment.schema';
import {
  ProgressPhoto,
  ProgressPhotoSchema,
} from '../../modules/units/schemas/progress-photo.schema';
import {
  BoqItem,
  BoqItemSchema,
} from '../../modules/surveyor/schemas/boq-item.schema';
import {
  Variation,
  VariationSchema,
} from '../../modules/surveyor/schemas/variation.schema';
import {
  Valuation,
  ValuationSchema,
} from '../../modules/surveyor/schemas/valuation.schema';
import {
  Feature,
  FeatureSchema,
} from '../../modules/features/schemas/feature.schema';
import {
  AiFeature,
  AiFeatureSchema,
} from '../../modules/ai-features/schemas/ai-feature.schema';
import {
  AiPlan,
  AiPlanSchema,
} from '../../modules/ai-plans/schemas/ai-plan.schema';
import {
  OrgSettings,
  OrgSettingsSchema,
} from '../../modules/org-settings/schemas/org-settings.schema';
import { Bid, BidSchema } from '../../modules/bids/schemas/bid.schema';

const FEATURE_MODELS = NestMongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Role.name, schema: RoleSchema },
  { name: Permission.name, schema: PermissionSchema },
  { name: Organization.name, schema: OrganizationSchema },
  { name: ChatSession.name, schema: ChatSessionSchema },
  { name: ChatMessage.name, schema: ChatMessageSchema },
  { name: Project.name, schema: ProjectSchema },
  { name: CadDrawing.name, schema: CadDrawingSchema },
  { name: Phase.name, schema: PhaseSchema },
  { name: Milestone.name, schema: MilestoneSchema },
  { name: Task.name, schema: TaskSchema },
  { name: DailyReport.name, schema: DailyReportSchema },
  { name: Issue.name, schema: IssueSchema },
  { name: Inspection.name, schema: InspectionSchema },
  { name: Rfi.name, schema: RfiSchema },
  { name: AuditLog.name, schema: AuditLogSchema },
  { name: Notification.name, schema: NotificationSchema },
  { name: Ticket.name, schema: TicketSchema },
  { name: Supplier.name, schema: SupplierSchema },
  { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
  { name: Delivery.name, schema: DeliverySchema },
  { name: MaterialRequest.name, schema: MaterialRequestSchema },
  { name: Budget.name, schema: BudgetSchema },
  { name: BudgetLine.name, schema: BudgetLineSchema },
  { name: Expense.name, schema: ExpenseSchema },
  { name: DocumentEntity.name, schema: DocumentEntitySchema },
  { name: Plan.name, schema: PlanSchema },
  { name: Invoice.name, schema: InvoiceSchema },
  { name: Unit.name, schema: UnitSchema },
  { name: Payment.name, schema: PaymentSchema },
  { name: ProgressPhoto.name, schema: ProgressPhotoSchema },
  { name: BoqItem.name, schema: BoqItemSchema },
  { name: Variation.name, schema: VariationSchema },
  { name: Valuation.name, schema: ValuationSchema },
  { name: Feature.name, schema: FeatureSchema },
  { name: AiFeature.name, schema: AiFeatureSchema },
  { name: AiPlan.name, schema: AiPlanSchema },
  { name: OrgSettings.name, schema: OrgSettingsSchema },
  { name: Bid.name, schema: BidSchema },
]);

/**
 * Global Mongoose module. One root connection + every model registered once
 * and exported app-wide so any service can @InjectModel without per-module
 * forFeature boilerplate.
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
