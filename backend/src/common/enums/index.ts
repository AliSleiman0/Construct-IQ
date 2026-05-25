// Replaces the @prisma/client enum re-exports. Values are the canonical strings
// stored on documents and matched by Mongoose schema `enum` constraints + DTO
// `@IsEnum` checks. Keep in sync with frontend role/permission expectations.

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PREPARATION = 'IN_PREPARATION',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum IssueType {
  GENERAL = 'GENERAL',
  TECHNICAL = 'TECHNICAL',
  QUALITY = 'QUALITY',
  SAFETY = 'SAFETY',
  PROCUREMENT = 'PROCUREMENT',
  BUDGET = 'BUDGET',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// SME-VALIDATE: this inspection-type taxonomy is a sensible construction-QA
// placeholder pending site-engineer/QA SME confirmation — it is NOT authoritative
// domain truth. Real projects key inspection types off the contract / QA-QC plan.
export enum InspectionType {
  SAFETY = 'SAFETY',
  QUALITY = 'QUALITY',
  STRUCTURAL = 'STRUCTURAL',
  ELECTRICAL = 'ELECTRICAL',
  MECHANICAL = 'MECHANICAL',
  PLUMBING = 'PLUMBING',
  GENERAL = 'GENERAL',
}

// Thin v1: a single status doubles as schedule-state AND outcome. A richer model
// (per-item checklist, PASS/FAIL/NA, conditional/re-inspect, formal sign-off) is
// deliberately deferred pending SME validation.
export enum InspectionStatus {
  SCHEDULED = 'SCHEDULED',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Thin v1 RFI lifecycle: a question (OPEN) gets a formal answer (ANSWERED) and is
// then closed out (CLOSED). No approval/distribution/impact tracking in v1.
export enum RfiStatus {
  OPEN = 'OPEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

// SME-VALIDATE placeholder taxonomy (mirrors InspectionType) — not authoritative.
export enum RfiDiscipline {
  ARCHITECTURAL = 'ARCHITECTURAL',
  STRUCTURAL = 'STRUCTURAL',
  MECHANICAL = 'MECHANICAL',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  CIVIL = 'CIVIL',
  GENERAL = 'GENERAL',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED',
}

export enum DocumentType {
  DRAWING = 'DRAWING',
  REPORT = 'REPORT',
  CONTRACT = 'CONTRACT',
  PURCHASE_DOCUMENT = 'PURCHASE_DOCUMENT',
  TECHNICAL_FILE = 'TECHNICAL_FILE',
  IMAGE = 'IMAGE',
  OTHER = 'OTHER',
}

export enum AIInsightType {
  DELAY_RISK = 'DELAY_RISK',
  COST_OVERRUN = 'COST_OVERRUN',
  PROCUREMENT_DELAY = 'PROCUREMENT_DELAY',
  SAFETY_CONCERN = 'SAFETY_CONCERN',
  GENERAL = 'GENERAL',
}

export enum AIInsightSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum UnitStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
}

export enum UnitType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  STUDIO = 'STUDIO',
  PENTHOUSE = 'PENTHOUSE',
  COMMERCIAL = 'COMMERCIAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

export enum PlanTier {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum AiPlanTier {
  ESSENTIALS = 'ESSENTIALS',
  ADVANCED = 'ADVANCED',
  PRO = 'PRO',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export enum TicketCategory {
  GENERAL = 'GENERAL',
  BILLING = 'BILLING',
  TECHNICAL = 'TECHNICAL',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
}
