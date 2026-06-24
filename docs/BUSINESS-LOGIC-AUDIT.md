# ConstructIQ — Business-Logic Audit (Multi-Agent Deep Sweep)

> **Date:** 2026-06-25  
> **Assessed against:** `main` @ `33c9853`  
> **Method:** 8 parallel investigators (one per business-logic dimension) → independent verification pass on every finding. 92 agents, ~12 min.  
> **Scope:** correctness bugs, security/tenancy holes, missing domain features, enforcement gaps.  
> **Companion docs:** `GO-LIVE-AND-FEATURE-ASSESSMENT.md`, `PRODUCTION-READINESS-ASSESSMENT.md`

## Result

**84 raw findings → 78 confirmed, 6 refuted, 0 unverified.** Each confirmed finding was re-checked by a second agent that re-read the cited code.

| Severity | Count |  | Category | Count |  | Top modules | Count |
|---|---|---|---|---|---|---|---|
| 🔴 critical | 6 |  | Correctness | 31 |  | procurement | 20 |
| 🟠 high | 60 |  | Missing feature | 28 |  | surveyor | 14 |
| 🟡 medium | 12 |  | Enforcement | 15 |  | tasks | 7 |

> Caveat: severities are the verifier-adjusted values. “Missing-feature” findings are domain capabilities a construction buyer expects but that are absent — weigh them against your launch scope, not as defects. A handful of medium items are latent (safe under current API flow, but unguarded at the data layer); each says so.

---

## 🔴 Critical (6)

### 1. 🔴 CRITICAL: Missing organizationId verification in AI summarize-report endpoint

**Module:** `ai` · **Category:** Security/Tenancy · **Location:** `ai.controller.ts:48-55` · **Confidence:** high

**What & impact:** The POST /ai/summarize-report/:reportId endpoint accepts a reportId parameter but does not inject @CurrentUser(). This allows an attacker to summarize any report in the platform by its ID without any organizational validation, accessing reports from other organizations.

**Evidence:** summarizeReport(@Param('reportId') reportId: string) { return this.reportSummaryAgent.summarize(reportId).then((summary) => ({ summary })); } — no user context passed to agent

**Fix:** Update controller to: summarizeReport(@Param('reportId') reportId: string, @CurrentUser() user: JwtPayload) { return this.reportSummaryAgent.summarize(reportId, user.organizationId, user.isSuperAdmin); }. Update agent to validate the report belongs to the caller's organization.

### 2. 🔴 Critical Multi-Tenancy Violation in Report Summary Agent

**Module:** `ai/agents` · **Category:** Security/Tenancy · **Location:** `backend/src/modules/ai/agents/report-summary.agent.ts:27` · **Confidence:** high

**What & impact:** The ReportSummaryAgent.summarize() method queries the DailyReport collection using only the _id field without filtering by organizationId. This allows any authenticated user to access and summarize daily reports from any organization in the system by knowing the report's ID, completely bypassing multi-tenancy isolation. An attacker from Organization A can read sensitive daily reports belonging to Organization B's projects.

**Evidence:** Line 27: `const report = await this.dailyReportModel.findOne({ _id: reportId }).lean();` - No organizationId check in the filter. The method receives no organizationId parameter to enforce tenant isolation.

**Fix:** Modify the ReportSummaryAgent.summarize() method to accept organizationId as a parameter and filter by both _id and organizationId:

```typescript
async summarize(reportId: string, organizationId: string): Promise<string> {
  const report = await this.dailyReportModel
    .findOne({ _id: reportId, organizationId })
    .lean();
  if (!report) {
    throw new NotFoundException(`Daily report ${reportId} not found`);
  }
  // ... rest of method
}
```

Update the orchestrator service call to pass organizationId from the request context.

### 3. 🔴 Billing invoice creation does not validate organizationId authorization

**Module:** `billing` · **Category:** Security/Tenancy · **Location:** `backend/src/modules/billing/billing.service.ts:22` · **Confidence:** high

**What & impact:** BillingService.create() accepts organizationId from the DTO without any validation that the caller's organization matches. The controller does not enforce multi-tenancy on invoice creation. A user can create invoices for any organization by sending a different organizationId in the request body.

**Evidence:** billing.service.ts:22-37 - `create(dto: CreateInvoiceDto)` receives organizationId from dto with no guard. billing.controller.ts:27-29 - create endpoint does not pass user.organizationId to the service; it trusts the DTO.

**Fix:** Change BillingService.create(organizationId: string, dto: CreateInvoiceDto) and pass user.organizationId from the controller. Do not allow clients to set organizationId in the request body. Validate dto.number is unique within the organization.

### 4. 🔴 Invoice status can be directly set to PAID (or any status) via generic update, bypassing payment workflow and approval

**Module:** `billing` · **Category:** Enforcement · **Location:** `backend/src/modules/billing/billing.service.ts:39-52` · **Confidence:** high

**What & impact:** The update() method at line 44 directly applies 'invoice.status = dto.status' with no state validation. The CreateInvoiceDto (used as base for UpdateInvoiceDto) allows optional status field with @IsEnum(InvoiceStatus). An ISSUED invoice can be directly patched to PAID status without any approval or confirmation workflow. The only semi-automatic behavior (line 45-46) sets paidAt timestamp if status is transitioned to PAID, but this is done unconditionally without payment verification. No approval step, no approver identity recorded, and no audit of who marked it paid. Invoices have no approvalBy or paymentApprovedBy fields to track who authorized payment.

**Evidence:** CreateInvoiceDto at backend/src/modules/billing/dto/create-invoice.dto.ts allows status (@IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus). BillingService.update() line 44 applies status directly. Invoice schema (backend/src/modules/billing/schemas/invoice.schema.ts) has no approvalById, paidApprovedById, or similar approval-tracking field. Controller PATCH at billing.controller.ts:31-35 requires PERMISSIONS.ALL, no distinct approval permission.

**Fix:** Add payment approval tracking fields to Invoice schema: approvedPaymentById, approvedPaymentAt, approvedPaymentNote. Remove status from UpdateInvoiceDto. Create a new approveInvoicePayment() service method and controller endpoint (POST /invoices/:id/approve-payment) that enforces ISSUED→PAID transition with approver identity and optional approval note. Require distinct PERMISSIONS.INVOICES.APPROVE_PAYMENT for this operation.

### 5. 🔴 PO totalAmount not computed from items; allows manual entry to diverge from line-item sum

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/schemas/purchase-order.schema.ts:59` · **Confidence:** high

**What & impact:** PurchaseOrder.totalAmount is nullable and manually set during creation (line 153 in procurement.service.ts), but there is no validation or automatic recalculation when items array is updated. Clients can set totalAmount independently of the items array, causing the header total to drift from sum(items[].totalPrice). This breaks budget rollups and spend reporting.

**Evidence:** procurement.service.ts:153 - `totalAmount: dto.totalAmount ?? null` accepts manual entry without validation. procurement.service.ts:172 - `if (dto.items !== undefined) po.items = dto.items as any;` does not recalculate totalAmount. No schema-level check or service-level enforcement exists.

**Fix:** Always compute PO.totalAmount from sum(items[].totalPrice) in the service layer. After creating or updating items, recalculate and persist totalAmount atomically. Add a getter in the schema or pre-save hook to validate totalAmount === sum(items).

### 6. 🔴 Variations can be directly set to APPROVED or REJECTED status via generic update endpoint, bypassing approval workflow

**Module:** `surveyor` · **Category:** Enforcement · **Location:** `backend/src/modules/surveyor/surveyor.service.ts:172-179` · **Confidence:** high

**What & impact:** The updateVariation() method uses Object.assign() to directly apply all DTO fields to the variation document, including the status field. The UpdateVariationDto includes @IsEnum(VariationStatus), allowing callers with PERMISSIONS.BUDGET.MANAGE to directly set status to APPROVED or REJECTED without triggering the approval workflow. This bypasses the approveVariation() method which enforces state validation (PENDING→APPROVED only) and records the approver identity. A user can create a variation, then immediately PATCH it to APPROVED status without any separate approval step or approver identity tracking.

**Evidence:** UpdateVariationDto at backend/src/modules/surveyor/dto/create-surveyor.dto.ts:31-36 includes '@IsEnum(VariationStatus) status?: VariationStatus'. updateVariation() at line 176 uses 'Object.assign(variation, dto)' which applies status. The endpoint at surveyor.controller.ts:86-90 gates both update and approve with identical permission (PERMISSIONS.BUDGET.MANAGE).

**Fix:** Remove status field from UpdateVariationDto entirely. Require callers to use the dedicated /variations/:id/approve endpoint to transition status. Implement a rejectVariation() service method and controller endpoint to explicitly handle PENDING→REJECTED transitions with rejection reason tracking (currently no rejection fields exist on Variation schema).

---

## 🟠 High (60)

### 7. 🟠 No validation that duplicate bids cannot be uploaded for the same project + trade package

**Module:** `bids` · **Category:** Correctness · **Location:** `backend/src/modules/bids/bids.service.ts:39-70 and bid.schema.ts:89` · **Confidence:** high

**What & impact:** The Bid schema has a unique index on { organizationId, projectId, tradePackage }, but the BidsService.uploadAndExtract() method does not explicitly check for or prevent duplicate uploads. The unique index will cause a database error, but the error is not caught and converted to a user-friendly message. Additionally, if the unique index check is bypassed (e.g., due to transaction isolation), duplicate bids could be created.

**Evidence:** BidsService.uploadAndExtract() does not query for existing bids before creating new ones. The processSingleBid() method creates a new bid document without checking for duplicates. The schema index (line 89) provides database-level protection but not application-level validation and messaging.

**Fix:** In BidsService.uploadAndExtract(), before processing files, check if bids already exist for the same (projectId, tradePackage): const existing = await this.bidModel.findOne({ organizationId, projectId: dto.projectId, tradePackage: dto.tradePackage }); if (existing) throw ConflictException('A bid for this trade package already exists; delete the existing bid first').

### 8. 🟠 No inter-module workflow triggers: Bid award should auto-create a PurchaseOrder draft

**Module:** `bids` · **Category:** Missing feature · **Location:** `bids/bids.service.ts (no method for bid award/selection)` · **Confidence:** high

**What & impact:** The Bids module extracts bid data but has no 'award' or 'select' workflow. A construction buyer cannot formally award a bid, which should trigger creation of a draft PurchaseOrder linked to the winning supplier. This seam is entirely missing.

**Evidence:** bids.service.ts has only uploadAndExtract(), list(), findOne(), remove(). No awardBid() or selectWinner() method. No reference to creating a PO when a bid is selected.

**Fix:** Add awardBid(bidId, supplierId, organizationId) method to BidsService. After marking a bid as awarded (add an 'awarded' or 'status' field if needed): create a draft PurchaseOrder via ProcurementService.createPO() with items populated from the extracted bid data, supplierIds set, and sourceDocumentId/linkedBidId reference.

### 9. 🟠 Invoice status can be set to any value, allowing DRAFT to jump to VOID or OVERDUE

**Module:** `billing` · **Category:** Correctness · **Location:** `backend/src/modules/billing/billing.service.ts:39-52` · **Confidence:** high

**What & impact:** The update method allows the status field to be set to any InvoiceStatus value without enforcing legal state transitions. A DRAFT invoice can be set directly to PAID, VOID, or OVERDUE. The only conditional logic (line 45-47) sets paidAt when status=PAID, but does not prevent illegal transitions. The intended flow is DRAFT → ISSUED → PAID (or OVERDUE, or VOID), but the generic update allows any path.

**Evidence:** update method (line 39-52): `if (dto.status !== undefined) invoice.status = dto.status;` directly assigns any status from UpdateInvoiceDto. InvoiceStatus enum: DRAFT, ISSUED, PAID, OVERDUE, VOID. The code only sets paidAt if transitioning to PAID (line 45-46), but does not prevent e.g. DRAFT → VOID directly, or PAID → DRAFT. BillingController (line 31-35) permits PATCH with no additional guards on status.

**Fix:** Define the state machine: DRAFT → ISSUED; ISSUED → {PAID, OVERDUE, VOID}; PAID → (terminal, no reversals); OVERDUE → {PAID, VOID}; VOID → (terminal). Add a guard in update: if (dto.status !== undefined && !isLegalTransition(invoice.status, dto.status)) { throw new BadRequestException('Illegal status transition'); }. Ensure PAID and VOID are terminal states — prevent reversals to DRAFT or ISSUED. Use a dedicated markPaid() endpoint that enforces ISSUED/OVERDUE → PAID.

### 10. 🟠 Invoice number uniqueness not scoped to organization

**Module:** `billing` · **Category:** Correctness · **Location:** `backend/src/modules/billing/billing.service.ts:23` · **Confidence:** high

**What & impact:** BillingService.create() checks invoice.number uniqueness globally (line 23: `findOne({ number: dto.number })`) without scoping to organizationId. If two organizations use the same invoice numbering scheme, the second organization's first invoice with that number is rejected as a duplicate.

**Evidence:** billing.service.ts:23 - `const existing = await this.invoiceModel.findOne({ number: dto.number });` - no organizationId filter. billing/schemas/invoice.schema.ts:18 - `unique: true` on number field is global, not org-scoped.

**Fix:** Change uniqueness check to: `findOne({ organizationId, number })` and update schema index to: `{ organizationId: 1, number: 1 }, { unique: true }`.

### 11. 🟠 No validation that invoice dueDate is after issuedDate

**Module:** `billing` · **Category:** Correctness · **Location:** `backend/src/modules/billing/dto/create-invoice.dto.ts:18-19 and billing.service.ts:32-33` · **Confidence:** high

**What & impact:** Invoice dueDate can be set to an earlier date than issuedDate. In construction billing, the due date must be logically after the issued date. No validation prevents issuedAt >= dueAt, which could create nonsensical payment terms (payment due before invoice is issued).

**Evidence:** CreateInvoiceDto accepts both issuedAt and dueAt as independent @IsDateString fields with no cross-field validation. BillingService.create() directly converts both to dates and saves without checking issuedAt < dueAt.

**Fix:** Add a custom validator or check in BillingService.create() that enforces dueAt > issuedAt. Either use a @ValidateIf decorator in the DTO or add explicit logic: if (dto.dueAt && dto.issuedAt && new Date(dto.dueAt) <= new Date(dto.issuedAt)) throw BadRequestException('Due date must be after issued date').

### 12. 🟠 Budget expenses not validated to belong to the same budget; cross-budget linking possible

**Module:** `budget` · **Category:** Correctness · **Location:** `backend/src/modules/budget/budget.service.ts:99-115` · **Confidence:** high

**What & impact:** When adding an expense via addExpense(), the service checks that the budget exists but does not validate that budgetLineId (if provided) belongs to the same budget. A user could reference a budget line from a different budget, causing expenses to roll up to the wrong budget's totals.

**Evidence:** budget.service.ts:99-115 - addExpense() validates budget exists (line 101) but budgetLineId is accepted without cross-validation. No check that lineModel.findOne({_id, budgetId}) validates the line is in this budget.

**Fix:** Before accepting a budgetLineId, validate it exists and belongs to the specified budget: `const line = await this.lineModel.findOne({ _id: dto.budgetLineId, budgetId }).lean();` If not found, throw NotFoundException.

### 13. 🟠 Budget line items can be added without checking total does not exceed budget.totalAmount

**Module:** `budget` · **Category:** Correctness · **Location:** `backend/src/modules/budget/budget.service.ts:75-86` · **Confidence:** high

**What & impact:** When adding a BudgetLine with plannedAmount, there is no validation that the sum of all planned amounts for a budget does not exceed the budget.totalAmount. In construction, budget line items must not exceed the allocated budget.

**Evidence:** BudgetService.addLine() (lines 75-86) creates a budget line without summing existing lines or checking against budget.totalAmount. No aggregate validation is performed.

**Fix:** In BudgetService.addLine(), sum all existing lines for the budget and validate: const totalPlanned = (await this.lineModel.aggregate([{ $match: { budgetId } }, { $group: { _id: null, total: { $sum: '$plannedAmount' } } }])); const newTotal = (totalPlanned[0]?.total ?? 0) + dto.plannedAmount; if (newTotal > budget.totalAmount) throw BadRequestException('Sum of budget lines cannot exceed total budget').

### 14. 🟠 Expense amount can be added without checking that spent does not exceed budget.totalAmount

**Module:** `budget` · **Category:** Correctness · **Location:** `backend/src/modules/budget/budget.service.ts:99-114` · **Confidence:** high

**What & impact:** When adding an Expense, there is no check that the total expenses plus committed amounts do not exceed the budget total. In construction, spending (actual expenses) must not exceed budget allocation. An uncontrolled expense entry could overrun the project budget.

**Evidence:** BudgetService.addExpense() (lines 99-114) creates an expense without summing existing expenses or checking against budget.totalAmount. The getBudgetSummaryWithCommitted() method computes totals for reporting, but addExpense() does not enforce the constraint.

**Fix:** In BudgetService.addExpense(), fetch all expenses and lines for the budget, sum the spent amount, and validate: const totalSpent = (await this.expenseModel.aggregate([...])); if ((totalSpent + dto.amount) > budget.totalAmount) throw BadRequestException('Adding this expense would exceed the budget').

### 15. 🟠 Budget Line Deleted Without Cleaning Referencing POs and Expenses

**Module:** `budget` · **Category:** Missing feature · **Location:** `budget/budget.service.ts:89-97` · **Confidence:** high

**What & impact:** When a BudgetLine is deleted via findOneAndDelete(), PurchaseOrder and Expense records with `budgetLineId` references are not cleaned up. POs with status SUBMITTED/APPROVED reference the now-deleted line, and expenses continue to reference a non-existent budgetLineId, breaking budget tracking calculations.

**Evidence:** removeLine() at line 89-97 calls `await this.lineModel.findOneAndDelete({ _id: lineId, budgetId })` with no cascade. PurchaseOrder schema line 45 has `@Prop({ type: String, ref: 'BudgetLine', default: null }) budgetLineId: string | null;` and Expense schema line 17 has `@Prop({ type: String, ref: 'BudgetLine', default: null }) budgetLineId: string | null;`. getBudgetSummaryWithCommitted() at line 185-195 queries POs with `budgetLineId: { $ne: null }` expecting valid line references.

**Fix:** In removeLine(), before deleting the BudgetLine, cascade the cleanup: (1) set `budgetLineId = null` on all Expenses and POs referencing it: `await Promise.all([this.expenseModel.updateMany({ budgetLineId: lineId }, { budgetLineId: null }), this.poModel.updateMany({ budgetLineId: lineId }, { budgetLineId: null })])`, then delete the line. Or use a transaction to ensure atomicity.

### 16. 🟠 Budget Deletion Has No Cascade to BudgetLines and Expenses

**Module:** `budget` · **Category:** Missing feature · **Location:** `budget/budget.service.ts` · **Confidence:** high

**What & impact:** BudgetService has no delete method for the Budget entity itself. If a Budget document is deleted, BudgetLine and Expense records with `budgetId` references remain orphaned. Additionally, PurchaseOrder entities reference both Budget (implicitly via BudgetLine) and BudgetLine directly.

**Evidence:** BudgetService has no delete/softDelete method visible in the provided code. BudgetLine schema line 10 has `@Prop({ type: String, ref: 'Budget', required: true, index: true }) budgetId: string;` and Expense schema line 13 has `@Prop({ type: String, ref: 'Budget', default: null, index: true }) budgetId: string | null;`. If Budget is deleted via raw operation, both become orphaned.

**Fix:** Add a deleteBudget() method to BudgetService that: (1) soft-deletes or nulls all Expenses with matching budgetId, (2) hard-deletes or soft-deletes all BudgetLines with matching budgetId (which also nulls PO budgetLineId), then (3) deletes the Budget itself. Use a transaction for atomicity.

### 17. 🟠 Dashboard metrics (budgetSpent, openIssueCount) are read-only and never written back from operational data

**Module:** `dashboard` · **Category:** Missing feature · **Location:** `dashboard/dashboard.service.ts:34-165` · **Confidence:** high

**What & impact:** The dashboard aggregates operational counts (expenses, issues, reports) on read but stores no cache/snapshot. If a user views the dashboard and later audits why a metric changed, there is no historical record of dashboard state at point-in-time (only current aggregate).

**Evidence:** getOrgDashboard() and getPmDashboard() compute all metrics from live collections (expenseModel, issueModel, etc.) via aggregation. There is no DashboardSnapshot collection that stores historical dashboard state.

**Fix:** Consider periodically storing a DashboardSnapshot (daily/weekly) that captures { budgetTotal, budgetSpent, openIssueCount, activeProjectCount, etc., snapshot_date } for trend analysis and auditing. This is lower priority unless audit-trail compliance requires it.

### 18. 🟠 Inspection result (PASSED/FAILED) has no downstream issue creation or notification

**Module:** `inspections` · **Category:** Missing feature · **Location:** `inspections/inspections.service.ts:124-145` · **Confidence:** high

**What & impact:** When an inspection fails (status → FAILED), no automatic issue is raised. A failed inspection should trigger creation of a work item (issue/task) to resolve the failure. Also no notification to project team.

**Evidence:** update() method at line 124 allows dto.status to change inspection.status freely, including to FAILED, but does NOT create an Issue or notify stakeholders.

**Fix:** In update(), if dto.status === InspectionStatus.FAILED and previous status was not FAILED: (1) call issuesService.create() to auto-generate a QUALITY issue linked to inspectionId; (2) call notificationsService.notify() to alert project manager 'Inspection {inspection.title} failed. Auto-created issue for remediation'; (3) stamp inspection.failureAcknowledgedBy if required.

### 19. 🟠 Issue status can be set to CLOSED directly, bypassing RESOLVED state

**Module:** `issues` · **Category:** Correctness · **Location:** `backend/src/modules/issues/issues.service.ts:341-364` · **Confidence:** high

**What & impact:** The update method allows the status field to be set to any IssueStatus value without enforcing the intended workflow: OPEN → IN_PROGRESS → RESOLVED → CLOSED. An issue can jump directly from OPEN to CLOSED, or from IN_PROGRESS back to OPEN, bypassing required states. The bulkUpdate method (line 285-307) does set resolvedAt and closedAt timestamps when status changes (line 292-293), which provides some audit trail, but no validation prevents illegal transitions.

**Evidence:** update method (line 341-364): `if (dto.status !== undefined) issue.status = dto.status;` directly assigns any status from UpdateIssueDto. UpdateIssueDto (line 9) allows `@IsOptional() @IsEnum(IssueStatus) status?: IssueStatus`. IssueStatus enum: OPEN, IN_PROGRESS, RESOLVED, CLOSED. The expected flow is OPEN → IN_PROGRESS → RESOLVED → CLOSED, but there is no enforcement. bulkUpdate (line 292-293) sets resolvedAt and closedAt but does not validate transitions. The code reopens issues by clearing resolvedAt/closedAt (line 296-297) when status is OPEN or IN_PROGRESS, which allows CLOSED to revert to any earlier state.

**Fix:** Define the state machine: OPEN → {IN_PROGRESS, CLOSED (admin only)}; IN_PROGRESS → {RESOLVED, OPEN}; RESOLVED → CLOSED; CLOSED → (terminal, no reopening unless admin override). Add a guard in update: if (dto.status !== undefined && !isLegalTransition(issue.status, dto.status)) { throw new BadRequestException('Illegal status transition'); }. Prevent reverting CLOSED issues unless explicit admin endpoint. For bulkUpdate, apply the same transition checks.

### 20. 🟠 Issue resolution has no automatic closure of related tasks or update of linked work items

**Module:** `issues` · **Category:** Missing feature · **Location:** `issues/issues.service.ts:341-364` · **Confidence:** high

**What & impact:** When an issue is marked RESOLVED or CLOSED, no downstream work items (tasks, RFIs, inspections) that depend on this issue are automatically updated. A quality defect resolved should mark related remediation tasks as eligible for completion.

**Evidence:** update() method at line 341 updates issue.status and conditionally sets resolvedAt/closedAt, but has NO calls to find and update related tasks or notify watchers.

**Fix:** When status changes to RESOLVED or CLOSED: (1) search for Tasks that reference this issue (via inspectionId or linked issue). If found, notify task assignees and optionally transition tasks to READY_FOR_REVIEW; (2) audit log the status change; (3) notify all users assigned to related work items.

### 21. 🟠 Issue comments have no audit trail or user notification of mentions/replies

**Module:** `issues` · **Category:** Missing feature · **Location:** `issues/issues.service.ts:381-396` · **Confidence:** high

**What & impact:** When a comment is added to an issue, no notification is sent to other watchers or commenters. A user cannot be alerted when someone replies to their comment on an issue.

**Evidence:** addComment() at line 381 appends comment to comments array and saves, but does NOT call notificationsService or auditService.

**Fix:** Call notificationsService.notify() to issue assignee, creator, and any previous commenters with message 'New comment on issue {title}: {excerpt}', type: 'ISSUE_COMMENT'. Optionally audit log for traceability.

### 22. 🟠 Organization Deletion Has No Cascade Logic

**Module:** `organizations` · **Category:** Missing feature · **Location:** `organizations/organizations.service.ts` · **Confidence:** high

**What & impact:** OrganizationsService has no delete/soft-delete method. If an organization is ever deleted (via raw MongoDB or admin action), all tenant data (Users, Projects, POs, Budgets, Tasks, Issues, Reports, etc.) with `organizationId` references are orphaned. The system lacks cascade semantics for org-level deletion.

**Evidence:** OrganizationsService has setActive() at line 422-430 to suspend orgs, but no softDelete() method. Organization schema line 30 has `@Prop({ type: String, ref: 'Organization', required: true, index: true })` on every tenant entity, and setActive() only sets `isActive` flag, not `deletedAt`. If an org is truly deleted, all tenant data remains.

**Fix:** Implement org softDelete() method that cascades soft-delete to all tenant-scoped entities (User, Project, Role, OrgSettings, Supplier, Budget, PurchaseOrder, Delivery, MaterialRequest, Task, Issue, Phase, Milestone, DailyReport, Valuation, Variation, Rfi, Inspection, Unit, Payment, Document, ProgressPhoto, etc.) in a single transaction before deleting the Organization itself.

### 23. 🟠 Purchase Order status can be set to DELIVERED illegally via generic update endpoint

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/procurement.service.ts:162-176` · **Confidence:** high

**What & impact:** The updatePO method allows the status field to be set to any value without enforcing legal state transitions. A DRAFT or REJECTED PO can be manually set directly to APPROVED, DELIVERED, or CANCELLED by sending a PATCH request with status in the DTO. The proper flow is DRAFT → SUBMITTED → APPROVED (or REJECTED), but the generic update bypasses this. Dedicated approve/reject endpoints exist but do not prevent the status from also being changed via the generic PATCH.

**Evidence:** updatePO (line 162-176): `if (dto.status !== undefined) po.status = dto.status;` directly assigns any status from the DTO without validation. CreatePurchaseOrderDto (line 33) allows `@IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus`, permitting creation with a non-DRAFT status. approvePO (line 178-191) and rejectPO (line 193-207) do check prior state, but they are optional: a user could PATCH the record with status=APPROVED directly. The PATCH endpoint (controller line 116-120) calls updatePO with no additional guard.

**Fix:** Remove status from UpdatePurchaseOrderDto or add a guard: if (dto.status !== undefined && dto.status !== po.status) { throw new BadRequestException('Status changes must use /approve or /reject endpoints'); }. Ensure the state machine is DRAFT → SUBMITTED (submit endpoint needed) → APPROVED or REJECTED. Prevent manual status assignment in the generic update.

### 24. 🟠 Delivery status can be set to any value via generic update without state validation

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/procurement.service.ts:257-270` · **Confidence:** high

**What & impact:** The updateDelivery method allows the status field to be set to any value without enforcing legal state transitions. A PENDING delivery can be illegally set directly to CANCELLED, or a DELIVERED delivery can be reverted to PENDING. The ConfirmDeliveryDto (line 23-26) correctly prevents client-side status manipulation for the confirm flow, but the generic UpdateDeliveryDto (line 11-16) permits any DeliveryStatus enum value. The intended flow is PENDING → IN_TRANSIT → DELIVERED (confirmed via POST endpoint), but generic PATCH bypasses this.

**Evidence:** updateDelivery (line 257-270): `if (dto.status !== undefined) delivery.status = dto.status;` directly assigns any status without validation. UpdateDeliveryDto (line 13) allows `@IsOptional() @IsEnum(DeliveryStatus) status?: DeliveryStatus`. The POST /deliveries/:id/confirm endpoint (controller line 238-242) correctly uses ConfirmDeliveryDto which does NOT allow status to be set (status is forced server-side to DELIVERED). However, PATCH allows arbitrary transitions. DeliveryStatus enum values: PENDING, IN_TRANSIT, DELIVERED, DELAYED, CANCELLED — all can be set directly.

**Fix:** Remove status from UpdateDeliveryDto or add a guard: if (dto.status !== undefined) { throw new BadRequestException('Status changes are not allowed via PATCH; use /confirm endpoint'); }. The confirm endpoint already correctly enforces status=DELIVERED server-side. Simplify updateDelivery to only allow editing deliveryDate, notes, and receivedById (which are immutable fields that should also be restricted).

### 25. 🟠 Supplier performance on-time calculation includes null deliveryDate without safeguard

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/procurement.service.ts:428-433` · **Confidence:** high

**What & impact:** getSupplierPerformance() on-time rate calculation counts deliveries where deliveryDate is NULL (line 431: $eq: ['$po.expectedDeliveryDate', null]) or deliveryDate <= expectedDeliveryDate as 'on-time'. When expectedDeliveryDate is null (no target date set), the delivery is marked on-time by default. This inflates on-time rates for suppliers whose POs have no delivery expectations. Missing delivery dates are treated as 'no deadline = on time'.

**Evidence:** procurement.service.ts:430-434 - `$or: [{ $eq: ['$po.expectedDeliveryDate', null] }, { $lte: ['$deliveryDate', '$po.expectedDeliveryDate'] }]` counts null expectedDeliveryDate as on-time.

**Fix:** Exclude deliveries from on-time calculation when expectedDeliveryDate is null. Require expectedDeliveryDate at PO creation if the supplier will be measured on timeliness. Alternatively, add an explicit 'noDeadlineSet' category to the performance report.

### 26. 🟠 Procurement dashboard spendByCategory uses PO items but does not filter by project

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/procurement.service.ts:515-535` · **Confidence:** high

**What & impact:** getProcurementDashboard() spendByCategory aggregation (line 516-535) sums PO items by description without ensuring the POs belong to specific projects. The orgFilter is applied (orgMatch) but if the organization has multiple projects, the dashboard mixes spend across all of them without context. Also, 30-day lookback is calculated from Date.now() (line 522) which may not respect timezones.

**Evidence:** procurement.service.ts:516-535 - `$match` uses orgMatch only, no projectId filter. `orderDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }` is timezone-naive.

**Fix:** If dashboard is org-wide, aggregate is correct. If dashboard should filter to user's project scope, apply projectId filter from context. Store timestamps in UTC explicitly. Consider adding a project filter parameter or returning a separate spend-by-project breakdown.

### 27. 🟠 PurchaseOrder expectedDeliveryDate can be in the past or before orderDate

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/dto/create-purchase-order.dto.ts:37 and procurement.service.ts:155-156` · **Confidence:** high

**What & impact:** The expectedDeliveryDate on a PO has no validation to ensure it is after the orderDate or not in the past. A PO can be created with an expected delivery date that is before the order was placed, which is logically impossible in construction procurement.

**Evidence:** CreatePurchaseOrderDto has @IsDateString for expectedDeliveryDate with no constraints. ProcurementService.createPO() accepts any date without comparison to orderDate. No check for past dates.

**Fix:** Add validation in ProcurementService.createPO() to ensure: (1) expectedDeliveryDate > orderDate if both are provided, and (2) expectedDeliveryDate is not in the past. Throw BadRequestException with a clear message if validation fails.

### 28. 🟠 No validation that PurchaseOrderItem.totalPrice equals quantity × unitPrice

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/schemas/purchase-order.schema.ts:8-28 and procurement.service.ts:158` · **Confidence:** high

**What & impact:** PurchaseOrderItem embeds quantity, unitPrice, and totalPrice but the service does not validate that totalPrice = quantity × unitPrice. This is a critical invariant in construction procurement: line item totals must be mathematically correct. An attacker or buggy client could create line items with incorrect totals, inflating the PO cost.

**Evidence:** PurchaseOrderItemDto and schema both allow totalPrice as an independent field. procurement.service.ts line 172 allows items to be set without validation: po.items = dto.items as any. No code multiplies quantity × unitPrice to verify totalPrice.

**Fix:** In ProcurementService.createPO() and updatePO(), validate each item in dto.items: for (const item of dto.items || []) { if (item.totalPrice !== item.quantity * item.unitPrice) throw BadRequestException('Item total price must equal quantity × unit price'); }

### 29. 🟠 No validation that PurchaseOrder.totalAmount matches sum of item.totalPrice

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/schemas/purchase-order.schema.ts:59-60 and procurement.service.ts:153` · **Confidence:** high

**What & impact:** The PO schema has a top-level totalAmount field that can be set independently of the sum of items.totalPrice. There is no validation that these two values are consistent. In construction, the PO total must equal the sum of all line items.

**Evidence:** CreatePurchaseOrderDto allows totalAmount to be optional and independent of items. ProcurementService.createPO() line 153: totalAmount: dto.totalAmount ?? null — no check against sum of item totals.

**Fix:** In ProcurementService.createPO() and updatePO(), after validating items, compute the expected PO total and validate: const expectedTotal = (dto.items || []).reduce((sum, item) => sum + item.totalPrice, 0); if (dto.totalAmount !== undefined && dto.totalAmount !== expectedTotal) throw BadRequestException('PO total amount must equal sum of item line totals').

### 30. 🟠 Hard Deletes Without Soft-Delete Consistency (Delivery, MaterialRequest)

**Module:** `procurement` · **Category:** Correctness · **Location:** `procurement/procurement.service.ts:272-278, 378-383` · **Confidence:** high

**What & impact:** Delivery and MaterialRequest use hard deleteOne() instead of soft-delete like other entities (PurchaseOrder, Supplier both soft-delete). This creates inconsistency: a hard-deleted Delivery leaves no audit trail and breaks any future soft-deleted PurchaseOrder that references it. MaterialRequest hard-delete is similarly problematic if convertedToPOId should maintain integrity.

**Evidence:** Line 276: `await this.deliveryModel.deleteOne({ _id: id })` and line 382: `await this.materialRequestModel.deleteOne({ _id: id })` both use hard deletes. Compare to line 123: `await this.supplierModel.updateOne({ _id: id }, { deletedAt: new Date() })` and line 213: `await this.poModel.updateOne({ _id: id }, { deletedAt: new Date() })` which soft-delete. Delivery/MaterialRequest schemas have no softDeletePlugin applied.

**Fix:** Either (1) add softDeletePlugin to Delivery and MaterialRequest schemas and change deleteOne to soft-delete updateOne, or (2) document and enforce hard-delete-only policy consistently across procurement entities. Soft-delete is preferred for audit and referential integrity.

### 31. 🟠 Supplier Deletion Leaves Orphaned POs and Supplies External User Linkage Unhandled

**Module:** `procurement` · **Category:** Missing feature · **Location:** `procurement/procurement.service.ts:119-125` · **Confidence:** high

**What & impact:** When a Supplier is soft-deleted, PurchaseOrder records with `supplierId` references remain pointing to the deleted supplier. Additionally, User documents may reference the supplier via `supplierId` field (line 99 of user.schema.ts), and when a supplier is deleted, external supplier users become orphaned with a dangling supplierId reference.

**Evidence:** deleteSupplier() at line 119-125 soft-deletes the supplier but does not null out or cascade-delete POs. PurchaseOrder schema line 42 has `@Prop({ type: String, ref: 'Supplier', required: true, index: true }) supplierId: string;` with no cascade. User schema line 99 has `@Prop({ type: String, ref: 'Supplier', default: null }) supplierId: string | null;` for external supplier users.

**Fix:** When deleting a supplier, cascade cleanup: (1) set `supplierId = null` on all User records: `await this.userModel.updateMany({ supplierId: id }, { supplierId: null })`, and (2) either soft-delete related POs or null their supplierId. Consider using a transaction for atomicity.

### 32. 🟠 Missing Uniqueness Constraint for PO Number May Allow Cross-Project Duplicates

**Module:** `procurement` · **Category:** Enforcement · **Location:** `procurement/schemas/purchase-order.schema.ts:100-103` · **Confidence:** high

**What & impact:** The PO unique index on (organizationId, poNumber) enforces uniqueness across the entire organization. However, it does not account for soft-deleted POs. A soft-deleted PO with poNumber 'PO-001' will still reserve that number, preventing a new org member from creating another PO with the same number even after the old one is deleted.

**Evidence:** PurchaseOrderSchema.index({ organizationId: 1, poNumber: 1 }, { unique: true }) at line 100-103 has no `partialFilterExpression: { deletedAt: null }`. Compare to User schema line 155-158 which includes `partialFilterExpression: { deletedAt: null }` for email uniqueness.

**Fix:** Update the unique index to exclude soft-deleted documents: `{ organizationId: 1, poNumber: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } }`. This allows soft-deleted POs to be re-created with the same number.

### 33. 🟠 Purchase Orders can be directly updated from DRAFT to SUBMITTED status, skipping formal submission workflow

**Module:** `procurement` · **Category:** Enforcement · **Location:** `backend/src/modules/procurement/procurement.service.ts:162-176` · **Confidence:** high

**What & impact:** The updatePO() method accepts a dto with optional status field (line 167: 'if (dto.status !== undefined) po.status = dto.status'). The CreatePurchaseOrderDto at dto/create-purchase-order.dto.ts:33 includes '@IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus', allowing direct status manipulation. A PO created as DRAFT can be directly updated to SUBMITTED via PATCH without any submit-for-approval workflow. This bypasses any intended business logic for formally declaring a PO ready for review. Approval and rejection endpoints expect SUBMITTED status (lines 182, 197) but nothing prevents a DRAFT PO from being pre-set to SUBMITTED.

**Evidence:** CreatePurchaseOrderDto line 33 allows optional status enum. updatePO() line 167 directly applies 'po.status = dto.status'. No intermediate submit endpoint exists (verified via grep for 'submit' in procurement module). Controller PATCH endpoint at procurement.controller.ts:116-120 gates with PERMISSIONS.PURCHASE_ORDERS.UPDATE, not a distinct submit permission.

**Fix:** Remove status from CreatePurchaseOrderDto and UpdatePurchaseOrderDto. Add a new submitPO() service method and controller endpoint (POST /:id/submit) that enforces DRAFT→SUBMITTED transition only. This ensures a formal submission step before approval is possible.

### 34. 🟠 Material Requests can have approval state directly set via generic update, bypassing reviewer segregation of duties

**Module:** `procurement` · **Category:** Enforcement · **Location:** `backend/src/modules/procurement/procurement.service.ts:310-327` · **Confidence:** high

**What & impact:** The updateMaterialRequest() method properly restricts editing to PENDING status (line 314-315), but the CreateMaterialRequestDto does NOT include a status field, so the update endpoint cannot directly manipulate status. However, the approval/rejection endpoints do not verify that the approver is different from the requester (requestedById vs reviewedById). A user who created a material request (requestedById = user.sub) can immediately call POST /material-requests/:id/approve with themselves as the approver (reviewedById = user.sub), violating segregation of duties. No check exists to prevent self-approval.

**Evidence:** approveMaterialRequest() at line 329 accepts reviewedById as a parameter and records it (line 338: 'mr.reviewedById = reviewedById') but never validates that reviewedById !== mr.requestedById. The controller passes user.sub as reviewedById (procurement.controller.ts:175). Material request always captures requestedById at creation (line 297: 'requestedById' from user.sub).

**Fix:** Add a check in approveMaterialRequest() and rejectMaterialRequest() service methods: 'if (reviewedById === mr.requestedById) throw new ForbiddenException("A request creator cannot approve/reject their own request")'. This enforces basic segregation of duties for the approval workflow.

### 35. 🟠 Delivery can bypass confirmDelivery() workflow and directly set receivedById and status via updateDelivery endpoint

**Module:** `procurement` · **Category:** Enforcement · **Location:** `backend/src/modules/procurement/procurement.service.ts:257-270` · **Confidence:** high

**What & impact:** The confirmDelivery() method at line 592 is a high-privilege operation that enforces project membership (member-gate) and sets both status=DELIVERED and receivedById=user.sub server-side. However, the generic updateDelivery() endpoint accepts both status (line 264) and receivedById (line 265) as optional fields in UpdateDeliveryDto, allowing anyone with PERMISSIONS.DELIVERIES.UPDATE to directly mark a delivery as DELIVERED and assign it to any user, completely bypassing the member-gate and the formal confirmation workflow. The controller gates confirm with PERMISSIONS.DELIVERIES.CONFIRM while update uses PERMISSIONS.DELIVERIES.UPDATE—two separate permissions.

**Evidence:** UpdateDeliveryDto at backend/src/modules/procurement/dto/create-delivery.dto.ts:11-16 includes optional 'status' and 'receivedById' fields. updateDelivery() at line 264-265 directly applies both: 'if (dto.status !== undefined) delivery.status = dto.status' and 'if (dto.receivedById !== undefined) delivery.receivedById = dto.receivedById ?? null'. confirmDelivery() (line 592-616) enforces member-gate only when orgWide is false. Controller update at line 227 gates with PERMISSIONS.DELIVERIES.UPDATE; confirm at line 239 uses PERMISSIONS.DELIVERIES.CONFIRM.

**Fix:** Remove 'status' and 'receivedById' fields from UpdateDeliveryDto. Only allow delivery-date and notes in generic updates. Require the confirmDelivery() endpoint to be used for all status transitions to DELIVERED, with the member-gate check always enforced (not optional based on orgWide).

### 36. 🟠 PO approval (APPROVED) has no notification trigger

**Module:** `procurement` · **Category:** Missing feature · **Location:** `procurement/procurement.service.ts:178-191` · **Confidence:** high

**What & impact:** When a Purchase Order status changes from SUBMITTED to APPROVED, no notification is sent to the stakeholders (requester, supplier, budget owner). Construction buyers expect automatic notification of PO approvals so they can plan next steps (expected delivery tracking, goods receipt coordination).

**Evidence:** approvePO() method (line 178-191) updates po.status, po.approvedById, po.approvedAt and saves but has NO NotificationsService.notify() call. Same gap in rejectPO() at line 193.

**Fix:** Inject NotificationsService into ProcurementService. After po.save() in approvePO(), call this.notificationsService.notify({ organizationId, userId: po.requesterIdOrBudgetOwnerId, title: 'Purchase Order Approved', message: `PO-${po.poNumber} approved`, type: 'PO_APPROVED', entityType: 'PurchaseOrder', entityId: po._id }). Same for rejectPO() with 'PO_REJECTED' type.

### 37. 🟠 Material Request approval/rejection has no notification

**Module:** `procurement` · **Category:** Missing feature · **Location:** `procurement/procurement.service.ts:329-359` · **Confidence:** high

**What & impact:** When material request status changes (PENDING → APPROVED, PENDING → REJECTED), no notification is sent to the requestor. Field users cannot be aware their request was approved or rejected without checking the app.

**Evidence:** approveMaterialRequest() at line 329 and rejectMaterialRequest() at line 345 update status, reviewedById, reviewedAt, reviewNote but have NO notification calls.

**Fix:** Call notificationsService.notify() in both approveMaterialRequest and rejectMaterialRequest methods. Notify the user who created the request (mr.requestedById) with status outcome.

### 38. 🟠 Delivery confirmation (DELIVERED) has no notification

**Module:** `procurement` · **Category:** Missing feature · **Location:** `procurement/procurement.service.ts:592-616` · **Confidence:** high

**What & impact:** When a site engineer confirms goods received (delivery status → DELIVERED), no notification is sent to the procurement team, supplier, or project manager. Procurement buyers cannot track delivery flow in real-time.

**Evidence:** confirmDelivery() at line 592 sets delivery.status = DeliveryStatus.DELIVERED, delivery.receivedById, saves but has NO notification call.

**Fix:** After delivery.save(), notify the PO owner (via poModel lookup) and procurement admins: 'Goods received for PO-X on Date', type: 'DELIVERY_CONFIRMED', entityType: 'Delivery', entityId: delivery._id.

### 39. 🟠 No audit logs for critical status changes in procurement (PO approve/reject, Delivery confirmed, Material Request review)

**Module:** `procurement` · **Category:** Enforcement · **Location:** `procurement/procurement.service.ts (approvePO, rejectPO, confirmDelivery, approveMaterialRequest, rejectMaterialRequest)` · **Confidence:** high

**What & impact:** Critical procurement decisions (PO approvals, rejections, goods receipt confirmations, material request reviews) are not logged to the audit trail. Compliance audits cannot trace who approved/rejected what and when.

**Evidence:** All approval/rejection methods in ProcurementService lack AuditService.log() calls. approvePO() line 178, rejectPO() line 193, confirmDelivery() line 592, approveMaterialRequest() line 329, rejectMaterialRequest() line 345 have no audit logs.

**Fix:** Inject AuditService into ProcurementService. After each status-changing save(): call auditService.log({ organizationId, actorUserId: user.sub, action: 'PO_APPROVED' / 'PO_REJECTED' / 'DELIVERY_CONFIRMED', entityType, entityId, metadata: { poNumber, supplierName, status, reason (for rejections) } }).

### 40. 🟠 No approver identity validation exists—creator can approve their own requests if they have both CREATE and APPROVE permissions

**Module:** `procurement, surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/surveyor.controller.ts:92-96, backend/src/modules/procurement/procurement.controller.ts:172-176` · **Confidence:** high

**What & impact:** While both CREATE and APPROVE permissions must be held, no check prevents a user from approving their own creation. The approveMaterialRequest and approveVariation methods record approver identity but never validate that the approver is different from the creator. For material requests, the creator identity is stored at requestedById. For variations, the creator is implicitly known from context (created by the same user calling approve). In construction workflows, segregation of duties is a critical control: the person who creates a request should not be able to immediately approve it.

**Evidence:** approveMaterialRequest() service (procurement.service.ts:329-343) accepts reviewedById but never compares to mr.requestedById. approveVariation() service (surveyor.service.ts:181-194) has no creator field to check against. Material requests pass requestedById at creation (line 297).

**Fix:** Add requester identity tracking to variations schema (requiredById field). In approveMaterialRequest and approveVariation, add: if (reviewedById === <creator>) throw ForbiddenException('Requesters cannot approve their own requests'). This enforces the critical segregation of duties principle.

### 41. 🟠 Project Deletion Does Not Cascade Soft-Delete to Child Entities

**Module:** `projects` · **Category:** Missing feature · **Location:** `projects/projects.service.ts:372-390` · **Confidence:** high

**What & impact:** When a Project is soft-deleted, all child entities (Task, Issue, Phase, Milestone, Unit, DailyReport, Valuation, Variation, Rfi, Bid, etc.) with `projectId` references are NOT soft-deleted. They remain visible in queries (since soft-delete plugin filters by `deletedAt: null`), creating orphaned data tied to a deleted project. Services like findAllTasks() will exclude soft-deleted projects implicitly but child documents remain.

**Evidence:** softDelete() at line 372-390 only calls `await this.projectModel.updateOne({ _id: id }, { deletedAt: new Date() })`. No cascade to children. Task schema line 32 has `projectId` required, Issue schema line 32 has `projectId` required, Phase schema line 14 has `projectId` required, Unit schema line 16 has `projectId` required, etc. None of these update their parentProjectId on parent deletion.

**Fix:** When soft-deleting a Project, cascade soft-delete to all children in a transaction: Task, Phase, Milestone, Issue, DailyReport, Rfi, Unit, Inspection, Variation, Valuation, Bid, ProgressPhoto, BudgetLine (implicitly via Budget), etc. Use `await Promise.all([...models.updateMany({ projectId: id }, { deletedAt: new Date() })])` before deleting the project itself.

### 42. 🟠 Hard Deletes on Milestone and Phase Dependencies Not Handled

**Module:** `projects` · **Category:** Missing feature · **Location:** `projects/schemas/milestone.schema.ts:50-51, projects/schemas/phase.schema.ts:42-43` · **Confidence:** high

**What & impact:** Both Milestone and Phase schemas define array references to other Milestones/Phases (dependsOnMilestoneIds, dependsOnPhaseIds) for dependency tracking. If a milestone/phase is deleted, dependent entities are not automatically cleaned of stale references. The arrays may contain references to deleted documents.

**Evidence:** Milestone schema line 50-51: `@Prop({ type: [String], ref: 'Milestone', default: [] }) dependsOnMilestoneIds: string[];` and Phase schema line 42-43: `@Prop({ type: [String], ref: 'Phase', default: [] }) dependsOnPhaseIds: string[];`. When a Milestone/Phase is deleted, no service removes it from other documents' dependency arrays.

**Fix:** When deleting a Milestone/Phase, cascade cleanup of dependency references: Use `updateMany` to remove the deleted ID from all documents' dependency arrays: `await milestoneModel.updateMany({ dependsOnMilestoneIds: { $in: [deletedId] } }, { $pull: { dependsOnMilestoneIds: deletedId } })`. Do this in a transaction with the milestone deletion itself.

### 43. 🟠 Project status transitions (PLANNING → ACTIVE, ACTIVE → COMPLETED) have no audit trail and no team notification

**Module:** `projects` · **Category:** Missing feature · **Location:** `projects/schemas/project.schema.ts (status field)` · **Confidence:** high

**What & impact:** When project status changes, no audit log is written and no team-wide notification is sent. Critical project lifecycle transitions (go-live, completion, cancellation) leave no trail and do not inform team members.

**Evidence:** ProjectsService.updateProjectStatus() or similar endpoint updates project.status but has no AuditService.log() or NotificationsService.notify() calls (not verified in detail; check projects.service.ts for the update method).

**Fix:** In ProjectsService update() or dedicated updateStatus() method: (1) call auditService.log() with action 'PROJECT_STATUS_CHANGED', metadata showing old/new status; (2) call notificationsService to notify all project members with message 'Project {name} status changed to {newStatus}'.

### 44. 🟠 RFI status can be set to any value, bypassing ANSWERED state

**Module:** `rfis` · **Category:** Correctness · **Location:** `backend/src/modules/rfis/rfis.service.ts:138-152` · **Confidence:** high

**What & impact:** The update method allows the status field to be set to any RfiStatus value without enforcing the intended workflow: OPEN → ANSWERED → CLOSED. An RFI can jump directly from OPEN to CLOSED, or revert from CLOSED back to OPEN or ANSWERED. The answer() endpoint (line 155-167) correctly sets status = ANSWERED and records answeredById/answeredAt, but the generic PATCH update endpoint bypasses this and allows arbitrary status changes.

**Evidence:** update method (line 138-152): `if (dto.status !== undefined) doc.status = dto.status;` directly assigns any status from UpdateRfiDto. UpdateRfiDto comment (line 6-8) states 'The answer fields are NOT settable here — answering is the manager-only POST /rfis/:id/answer action', but the status field IS settable, which undermines the intent. answer() endpoint (line 155-167) correctly enforces status=ANSWERED and records answeredById/answeredAt. However, a user could PATCH the status directly to ANSWERED without calling answer(), thus not recording who answered or when.

**Fix:** Remove status from UpdateRfiDto, or add a guard: if (dto.status !== undefined) { throw new BadRequestException('Status can only be changed via the /answer endpoint'); }. The state machine is: OPEN → ANSWERED (via answer() endpoint) → CLOSED (via a close() endpoint to be created). Update should only allow editing subject, question, discipline, respondentId, and dueBy — never the status or answer fields.

### 45. 🟠 RFI answered (ANSWERED) has no notification

**Module:** `rfis` · **Category:** Missing feature · **Location:** `rfis/rfis.service.ts:154-167` · **Confidence:** high

**What & impact:** When an RFI is answered (status OPEN → ANSWERED), no notification is sent to the person who raised the RFI. The site engineer must check the app to know if their question has been answered.

**Evidence:** answer() method at line 154 sets doc.answer, doc.answeredById, doc.answeredAt, doc.status = RfiStatus.ANSWERED, saves but has NO notification call.

**Fix:** Inject NotificationsService. After doc.save(), call notify() to RFI creator (createdById) with message 'RFI-NUMBER answered: {summary of answer}', type: 'RFI_ANSWERED', entityType: 'RFI', entityId: id.

### 46. 🟠 Wrong permission on POST /support-tickets endpoint

**Module:** `support-tickets` · **Category:** Enforcement · **Location:** `support-tickets.controller.ts:35-39` · **Confidence:** high

**What & impact:** The POST endpoint to create a support ticket uses @RequirePermissions(PERMISSIONS.TICKETS.READ), but creating a resource should require a CREATE or MANAGE permission, not READ. This allows any user with read-only access to create tickets.

**Evidence:** @Post() @RequirePermissions(PERMISSIONS.TICKETS.READ) create(...) — should be MANAGE

**Fix:** Change to @RequirePermissions(PERMISSIONS.TICKETS.MANAGE).

### 47. 🟠 Wrong permission on POST /support-tickets/:id/comments endpoint

**Module:** `support-tickets` · **Category:** Enforcement · **Location:** `support-tickets.controller.ts:51-59` · **Confidence:** high

**What & impact:** Adding a comment to a support ticket uses @RequirePermissions(PERMISSIONS.TICKETS.READ), allowing read-only users to modify tickets by adding comments. Should require MANAGE permission.

**Evidence:** @Post(':id/comments') @RequirePermissions(PERMISSIONS.TICKETS.READ) addComment(...) — should be MANAGE

**Fix:** Change to @RequirePermissions(PERMISSIONS.TICKETS.MANAGE).

### 48. 🟠 Variation status can be set to any value via generic update without state guard

**Module:** `surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/surveyor.service.ts:172-179` · **Confidence:** high

**What & impact:** The updateVariation method allows arbitrary status changes without validating legal transitions. A PENDING variation can be illegally reverted to PENDING from APPROVED or REJECTED, or jumped directly to REJECTED without approval. The VariationStatus enum defines PENDING → APPROVED → (no explicit way back), but updateVariation uses Object.assign(variation, dto) which permits any status value. Only approveVariation has a guard checking status === PENDING before allowing the transition to APPROVED.

**Evidence:** updateVariation (line 172-179): Object.assign(variation, dto) directly applies dto properties including status without validation. Contrast with approveVariation (line 181-194) which checks `if (variation.status !== VariationStatus.PENDING)`. UpdateVariationDto (surveyor.dto, line 35) allows `@IsEnum(VariationStatus) status?: VariationStatus`, meaning any enum value is accepted. No rejection flow exists — once APPROVED, an update could set it back to PENDING or REJECTED.

**Fix:** Add a transition guard in updateVariation: if (dto.status !== undefined && dto.status !== variation.status) { throw new BadRequestException('Status can only be changed via approve/reject endpoints'); }. Or implement a proper state machine: only allow PENDING → nothing (reject via endpoint), APPROVED → nothing (locked). Remove status from UpdateVariationDto so only explicit approve/reject endpoints can change it.

### 49. 🟠 Valuation status can be set to any value via generic update without state guard

**Module:** `surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/surveyor.service.ts:231-237` · **Confidence:** high

**What & impact:** The updateValuation method allows arbitrary status changes without validating legal transitions. A DRAFT valuation can be jumped directly to CERTIFIED without passing through SUBMITTED, or a CERTIFIED valuation can be reverted to DRAFT. The ValuationStatus enum defines DRAFT → SUBMITTED → CERTIFIED, but updateValuation uses Object.assign(valuation, dto) which permits any status value. Only certifyValuation has a guard checking status === SUBMITTED before allowing the transition to CERTIFIED.

**Evidence:** updateValuation (line 231-237): Object.assign(valuation, dto) directly applies dto properties including status without validation. Contrast with certifyValuation (line 240-252) which checks `if (valuation.status !== ValuationStatus.SUBMITTED)`. UpdateValuationDto (surveyor.dto, line 48) allows `@IsEnum(ValuationStatus) status?: ValuationStatus`, meaning any enum value is accepted. No SUBMITTED transition exists via a dedicated endpoint — status can only move via generic update.

**Fix:** Add a transition guard in updateValuation: if (dto.status !== undefined && dto.status !== variation.status) { throw new BadRequestException('Status can only be changed via certify endpoint'); }. Or remove status from UpdateValuationDto and create explicit submit() and certify() endpoints that enforce DRAFT → SUBMITTED → CERTIFIED. Ensure the SUBMITTED state can only be set programmatically or via a dedicated submit action.

### 50. 🟠 Valuation retention calculation not audited; service cannot explain how retention is computed

**Module:** `surveyor` · **Category:** Missing feature · **Location:** `backend/src/modules/surveyor/surveyor.service.ts:215-229` · **Confidence:** high

**What & impact:** createValuation() accepts retentionUsd as manual input with @Min(0) validation only. There is no business rule, formula, or audit trail for how retention is calculated (e.g., 5% of amountUsd, fixed amount, cumulative cap). Service does not enforce that retentionUsd <= amountUsd or that cumulative retention across all valuations does not exceed a project-level retention cap.

**Evidence:** surveyor.service.ts:224 - `retentionUsd: dto.retentionUsd ?? 0` accepts any non-negative value. create-surveyor.dto.ts:42 - `@IsOptional() @IsNumber() @Min(0) retentionUsd?: number;` - no @Max or formula.

**Fix:** Document and enforce the retention policy: (a) add retentionPercentage field to project or valuation, (b) compute retentionUsd = amountUsd * retentionPercentage, (c) validate cumulative retention across all valuations does not exceed a max cap. Add an audit log entry when retention is finalized.

### 51. 🟠 Variation.impactAmount has no constraint (can be any number, positive or negative, with no bounds)

**Module:** `surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/dto/create-surveyor.dto.ts:27 and surveyor.service.ts:164` · **Confidence:** high

**What & impact:** The impactAmount field on Variation (contract changes) is declared as @IsNumber() with no @Min, @Max, or bounds. The schema comment says 'Positive = addition, negative = deduction', but there is no upper bound check to prevent unreasonable variations (e.g., a single variation adding more value than the entire contract). A variation should not exceed the original contract value.

**Evidence:** CreateVariationDto line 27: @IsNumber() impactAmount!: number — no bounds. UpdateVariationDto line 34: @IsOptional() @IsNumber() impactAmount? — no bounds. surveyor.service.ts creates variations without checking against the BOQ total or contract value.

**Fix:** Fetch the BOQ for the project and compute its total. Validate that the approved variations (sum of all APPROVED impactAmounts) do not cause the contract value to exceed a reasonable threshold (e.g., 50% of BOQ or a project setting). Throw BadRequestException if exceeded. At minimum, add comment explaining the business rule.

### 52. 🟠 No validation that Valuation.retentionUsd ≤ Valuation.amountUsd

**Module:** `surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/schemas/valuation.schema.ts:29-31 and surveyor.service.ts:224` · **Confidence:** high

**What & impact:** Valuation stores amountUsd and retentionUsd independently. Retention (amount withheld) must never exceed the invoiced amount. If retentionUsd > amountUsd, the retained amount exceeds the total, which is logically impossible in construction contracts.

**Evidence:** ValuationSchema has @Prop({ type: Number, default: 0, min: 0 }) retentionUsd with no upper bound. CreateValuationDto line 42: @IsOptional() @IsNumber() @Min(0) retentionUsd — only checks >= 0. surveyor.service.ts creates valuations without comparing retention to amount.

**Fix:** In SurveyorService.createValuation() and updateValuation(), validate: if (dto.retentionUsd && dto.amountUsd && dto.retentionUsd > dto.amountUsd) throw BadRequestException('Retention cannot exceed the valuation amount').

### 53. 🟠 Valuations can bypass certifyValuation() workflow and directly set status to SUBMITTED or CERTIFIED via update endpoint

**Module:** `surveyor` · **Category:** Enforcement · **Location:** `backend/src/modules/surveyor/surveyor.service.ts:231-238` · **Confidence:** high

**What & impact:** The updateValuation() method uses Object.assign() to directly apply all DTO fields, including status. The UpdateValuationDto at dto/create-surveyor.dto.ts:45-49 includes '@IsEnum(ValuationStatus) status?: ValuationStatus', allowing direct status manipulation. A valuation created as DRAFT can be directly patched to SUBMITTED or even CERTIFIED without any workflow. The certifyValuation() endpoint enforces a state check (SUBMITTED→CERTIFIED only, line 244) and records the certifier identity, but updateValuation() bypasses this entirely. A user can set a valuation to CERTIFIED directly via PATCH without any formal certification step.

**Evidence:** UpdateValuationDto line 48 includes '@IsEnum(ValuationStatus) status?: ValuationStatus'. updateValuation() line 235 uses 'Object.assign(valuation, dto)' which applies status. No intermediate submit endpoint exists. certifyValuation() at line 240-253 enforces SUBMITTED→CERTIFIED check (line 244) and records certifiedById/certifiedAt only when the dedicated endpoint is used.

**Fix:** Remove status from UpdateValuationDto. Add a submitValuation() service method and controller endpoint (POST /:id/submit) enforcing DRAFT→SUBMITTED only. Keep certifyValuation() for SUBMITTED→CERTIFIED with its current state validation and certifier identity recording.

### 54. 🟠 No rejection workflow exists for variations despite REJECTED status enum

**Module:** `surveyor` · **Category:** Missing feature · **Location:** `backend/src/modules/surveyor/schemas/variation.schema.ts:5-9` · **Confidence:** high

**What & impact:** The VariationStatus enum includes REJECTED state, but the service has no rejectVariation() method and the controller has no reject endpoint. The schema has no fields to record rejection reason, rejectedBy identity, or rejectionAt timestamp (unlike PurchaseOrder which has rejectedById, rejectedAt, rejectionReason). This indicates an incomplete workflow: variations can be approved but not formally rejected through a dedicated endpoint. If a variation needs to be rejected, the current workaround would be manual status manipulation (via the vulnerable update endpoint) without audit trail.

**Evidence:** Variation schema line 5-9 defines VariationStatus.REJECTED, but surveyor.service.ts has no rejectVariation() method. surveyor.controller.ts has no @Post(':id/reject') endpoint. No rejectedById, rejectedAt, rejectionReason fields on Variation schema (variation.schema.ts:1-58).

**Fix:** Add rejectedById, rejectedAt, rejectionReason fields to Variation schema. Implement rejectVariation() service method (mirror of approveVariation) enforcing PENDING→REJECTED. Add POST /variations/:id/reject controller endpoint gated by PERMISSIONS.BUDGET.MANAGE with optional rejection reason in body.

### 55. 🟠 Variation approval has no notification

**Module:** `surveyor` · **Category:** Missing feature · **Location:** `surveyor/surveyor.service.ts:181-194` · **Confidence:** high

**What & impact:** When a contract variation status changes (PENDING → APPROVED), no notification is sent to the cost analyst or project controls. Approval decisions are not communicated to stakeholders.

**Evidence:** approveVariation() at line 181 updates variation.status to APPROVED, sets approvedById/approvedAt, saves but has NO notification.

**Fix:** After variation.save(), notify relevant stakeholders (project manager, cost analyst) with message 'Variation {variation.title} approved. Contract impact: +/- ${variation.impactAmount}', type: 'VARIATION_APPROVED'.

### 56. 🟠 No audit logs for critical surveyor status changes (Variation approval, Valuation certification)

**Module:** `surveyor` · **Category:** Enforcement · **Location:** `surveyor/surveyor.service.ts (approveVariation line 181, certifyValuation line 240)` · **Confidence:** high

**What & impact:** Financial and contractual changes (variation approvals, valuation certifications) have no audit trail. Cost control decisions cannot be audited for compliance or dispute resolution.

**Evidence:** approveVariation() at line 181 and certifyValuation() at line 240 have NO AuditService.log() calls.

**Fix:** Inject AuditService into SurveyorService. After variation.save() and valuation.save(): call auditService.log({ action: 'VARIATION_APPROVED' / 'VALUATION_CERTIFIED', entityType, metadata: { title, impactAmount / amountUsd, certifiedById/approvedById } }).

### 57. 🟠 Hard Deletes on Task Dependencies Not Cleaned Up

**Module:** `tasks` · **Category:** Missing feature · **Location:** `projects/schemas/task.schema.ts:89-90, tasks/tasks.service.ts:228-238` · **Confidence:** high

**What & impact:** Task schema defines `dependsOnTaskIds` as an array of Task references. When a Task is soft-deleted, other Tasks that depend on it are not updated; their `dependsOnTaskIds` arrays contain stale references to the deleted task.

**Evidence:** Task schema line 89-90: `@Prop({ type: [String], ref: 'Task', default: [] }) dependsOnTaskIds: string[];`. softDelete() at tasks/tasks.service.ts line 228-238 calls `updateOne({ deletedAt: new Date() })` but does not remove the deleted task ID from other tasks' dependency arrays.

**Fix:** In TasksService.softDelete(), after soft-deleting the task, cascade-clean dependencies: `await this.taskModel.updateMany({ dependsOnTaskIds: { $in: [id] } }, { $pull: { dependsOnTaskIds: id } })`. Wrap in a transaction with the task deletion for atomicity.

### 58. 🟠 Task completion (DONE) has no audit log and no downstream milestone progress update

**Module:** `tasks` · **Category:** Missing feature · **Location:** `tasks/tasks.service.ts:124-157` · **Confidence:** high

**What & impact:** When a task status changes to DONE, (1) no audit log is written, (2) no notification is sent to assignees/watchers, (3) parent milestone progress is not recalculated. A construction project manager cannot see who completed tasks or milestone progress updates.

**Evidence:** update() method at line 124 allows dto.status updates, and when status === 'DONE' it stamps completedAt (line 149-153), but has NO AuditService.log() call and NO NotificationsService.notify() call.

**Fix:** After task.save(): (1) call auditService.log({ entityType: 'Task', action: 'TASK_COMPLETED', entityId: id, metadata: { title: task.title, completedAt: new Date() } }); (2) call notificationsService.notify() to task creator/assignee with 'Task completed: {title}'; (3) lookup parent milestone (if task.phaseId exists) and trigger progress recalculation via milestone.updateCompletionPercent().

### 59. 🟠 Task comments have no notification of mentions or replies

**Module:** `tasks` · **Category:** Missing feature · **Location:** `tasks/tasks.service.ts:211-226` · **Confidence:** high

**What & impact:** Task comments are added with no notification to assignees or collaborators. Users must check the app to see if their task has been commented on.

**Evidence:** addComment() at line 211 appends comment but has NO notificationsService.notify() call.

**Fix:** Notify task.assignedToId and task.createdById when a new comment is added, with message 'Comment on task {title}: {excerpt}'.

### 60. 🟠 No event trigger for tasks becoming overdue (dueDate passed without completion)

**Module:** `tasks` · **Category:** Missing feature · **Location:** `tasks/tasks.service.ts (no dueDate monitoring)` · **Confidence:** high

**What & impact:** Tasks with a dueDate in the past remain in non-terminal status (TODO, IN_PROGRESS, BLOCKED) with no notification or warning. A project manager cannot automatically see overdue tasks highlighted or receive a notification when a deadline is missed.

**Evidence:** TasksService allows filtering by status, projectId, assignedToId but has no 'findOverdue()' method or scheduled job to check and notify on dueDate violations.

**Fix:** Add a cron job (via NestJS Scheduler) that runs daily: find all tasks with dueDate < now and status !== DONE, then notify assignees and project manager. Optionally set a 'isOverdue' flag on the task doc for indexing.

### 61. 🟠 Wrong permission on POST /tickets endpoint

**Module:** `tickets` · **Category:** Enforcement · **Location:** `tickets.controller.ts:41-45` · **Confidence:** high

**What & impact:** The POST endpoint to create a ticket uses @RequirePermissions(PERMISSIONS.TICKETS.READ), but creating a resource should require MANAGE permission, not READ. This allows any user with read-only access to create tickets.

**Evidence:** @Post() @RequirePermissions(PERMISSIONS.TICKETS.READ) create(...) — should be MANAGE

**Fix:** Change to @RequirePermissions(PERMISSIONS.TICKETS.MANAGE).

### 62. 🟠 Wrong permission on POST /tickets/:id/comments endpoint

**Module:** `tickets` · **Category:** Enforcement · **Location:** `tickets.controller.ts:65-69` · **Confidence:** high

**What & impact:** Adding a comment to a ticket uses @RequirePermissions(PERMISSIONS.TICKETS.READ), allowing read-only users to modify tickets by adding comments. Should require MANAGE permission.

**Evidence:** @Post(':id/comments') @RequirePermissions(PERMISSIONS.TICKETS.READ) addComment(...) — should be MANAGE

**Fix:** Change to @RequirePermissions(PERMISSIONS.TICKETS.MANAGE).

### 63. 🟠 Unit payment installments not validated; no check that sum equals unit.priceUsd

**Module:** `units` · **Category:** Correctness · **Location:** `backend/src/modules/units/units.service.ts:106-120` · **Confidence:** high

**What & impact:** When creating Payment records for a unit, there is no validation that sum(all installments for the unit) equals unit.priceUsd. A user can create installments with arbitrary amounts and totalInstallments count, leading to shortfall or overpayment. The payment schedule is orphaned from the unit price contract.

**Evidence:** units.service.ts:106-120 - createPayment() accepts amountUsd and totalInstallments independently with @Min(0) and @Min(1) constraints only. No aggregation check against unit.priceUsd. payment.schema.ts has no reference or constraint tying installments to unit price.

**Fix:** Before creating a payment, sum existing payments for the unit and validate that (sum + new amountUsd) <= unit.priceUsd. Enforce that the final payment closes exactly to unit.priceUsd. Add a 'remainingBalance' calculation to the unit or payment list response.

### 64. 🟠 Payment status enum missing PARTIAL state; no midpoint for part-paid installments

**Module:** `units` · **Category:** Missing feature · **Location:** `backend/src/common/enums/index.ts:177-182` · **Confidence:** high

**What & impact:** PaymentStatus enum has PENDING, PAID, OVERDUE, CANCELLED but no PARTIAL state. If an installment is paid in part (e.g., 50% down, balance later), the binary PENDING/PAID transition does not capture partial payment. This forces unit payment schedules to use all-or-nothing semantics, which is not typical for construction payment plans.

**Evidence:** enums/index.ts:177-182 - PaymentStatus enum does not include PARTIAL. units.service.ts:130 - status transitions only between defined enum values.

**Fix:** Add PaymentStatus.PARTIAL or PARTIALLY_PAID. When updating a payment, if new paidAmount > 0 and < amountUsd, set status to PARTIAL and store paidAmount separately from amountUsd. Update schema and DTOs accordingly.

### 65. 🟠 Orphaned Payments When Unit is Deleted

**Module:** `units` · **Category:** Missing feature · **Location:** `units/units.service.ts:86-92` · **Confidence:** high

**What & impact:** When a Unit is soft-deleted, Payment documents with references to that unitId are not cleaned up or cascade-deleted. The Payment schema has `unitId` as a required reference with no cascade behavior. Soft-deleted units leave orphaned payment records that will attempt to reference non-existent units.

**Evidence:** deleteUnit() at line 86-92 only soft-deletes the Unit with `deletedAt = new Date()`, but does not delete or update related Payment records. Payment schema line 14 references Unit with `@Prop({ type: String, ref: 'Unit', required: true, index: true }) unitId: string;` with no cascade rules.

**Fix:** When deleting a unit, cascade the deletion to all related Payment records: `await this.paymentModel.deleteMany({ unitId: id })` or soft-delete them if Payment requires soft-delete pattern. Alternatively, add OnDelete cascade behavior to the schema if MongoDB supports it, or implement application-level cascade in a transaction.

### 66. 🟠 CRITICAL: Horizontal access vulnerability in /users/:id endpoint

**Module:** `users` · **Category:** Security/Tenancy · **Location:** `users.controller.ts:95-99` · **Confidence:** high

**What & impact:** The GET /users/:id endpoint does not pass organizationId to the service and the service does not filter by organizationId. An attacker can enumerate and read any user by ID across the entire platform, regardless of which organization they belong to.

**Evidence:** Controller: findOne(@Param('id') id: string) { return this.usersService.findById(id); } | Service: async findById(id: string) { const user = await this.userModel.findOne({ _id: id }).lean(); } — no organizationId filtering

**Fix:** Update controller to: findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) { return this.usersService.findById(id, user.organizationId, user.isSuperAdmin); }. Update service to filter by organizationId unless isSuperAdmin is true.

---

## 🟡 Medium (12)

### 67. 🟡 Invoice payment completion (PAID) has no reconciliation trigger

**Module:** `billing` · **Category:** Missing feature · **Location:** `billing/billing.service.ts:39-52` · **Confidence:** high

**What & impact:** When an invoice is marked PAID, no reconciliation with the valuation or contract cash flow is performed. An invoice-to-valuation relationship is not tracked, preventing accurate cumulative-billing summaries.

**Evidence:** update() method at line 39 stamps paidAt when status → PAID, but does NOT notify stakeholders or update budget/cash-flow records.

**Fix:** After invoice.save() in update(): (1) notify accounting/finance: 'Invoice {number} marked paid on {paidAt}'; (2) if invoiceModel carries a valuationId or planId reference, update that Valuation/Plan record to mark it as 'invoice generated' or 'invoice paid'.

### 68. 🟡 Document References to Deleted DailyReport, Issue Not Cleaned

**Module:** `documents` · **Category:** Missing feature · **Location:** `documents/schemas/document.schema.ts:20-24` · **Confidence:** high

**What & impact:** Document schema has optional references to DailyReport and Issue. When a DailyReport or Issue is deleted, Document records with matching dailyReportId or issueId are not cleaned up. This creates orphaned document references to non-existent entities.

**Evidence:** DocumentEntity schema line 20-21: `@Prop({ type: String, ref: 'DailyReport', default: null }) dailyReportId: string | null;` and line 23-24: `@Prop({ type: String, ref: 'Issue', default: null }) issueId: string | null;`. When softDelete() at documents/documents.service.ts deletes a document, or when DailyReport/Issue are deleted, no cascade occurs.

**Fix:** In DailyReport and Issue softDelete() methods, cascade null-out of Document references: `await this.documentModel.updateMany({ dailyReportId: id }, { dailyReportId: null })` and `await this.documentModel.updateMany({ issueId: id }, { issueId: null })` respectively. Consider using a transaction.

### 69. 🟡 Wrong permission on PATCH /material-requests/:id endpoint

**Module:** `procurement` · **Category:** Enforcement · **Location:** `procurement.controller.ts:166-170` · **Confidence:** high

**What & impact:** Updating a material request uses @RequirePermissions(PERMISSIONS.MATERIAL_REQUESTS.CREATE) instead of MANAGE. CREATE permission is for creating new resources, not modifying existing ones. This conflates two distinct operations.

**Evidence:** @Patch(':id') @RequirePermissions(PERMISSIONS.MATERIAL_REQUESTS.CREATE) update(...) — should use MANAGE

**Fix:** Change to @RequirePermissions(PERMISSIONS.MATERIAL_REQUESTS.MANAGE).

### 70. 🟡 No check that Delivery.deliveryDate does not predate PurchaseOrder.orderDate

**Module:** `procurement` · **Category:** Correctness · **Location:** `backend/src/modules/procurement/procurement.service.ts:611` · **Confidence:** high

**What & impact:** When confirming a delivery, the deliveryDate can be any date in the past without verification that it is not before the PO orderDate. A delivery cannot logically occur before a purchase order is placed.

**Evidence:** ProcurementService.confirmDelivery() accepts ConfirmDeliveryDto with an optional deliveryDate, sets it without validation against the linked PO's orderDate: delivery.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : (delivery.deliveryDate ?? new Date()); No lookup of the PO to check constraints.

**Fix:** In confirmDelivery(), fetch the linked PurchaseOrder and validate: if (dto.deliveryDate && po.orderDate && new Date(dto.deliveryDate) < po.orderDate) throw BadRequestException('Delivery date cannot be before purchase order date').

### 71. 🟡 No audit logs for RFI lifecycle changes (creation, answer, closure)

**Module:** `rfis` · **Category:** Enforcement · **Location:** `rfis/rfis.service.ts (create line 122, answer line 154)` · **Confidence:** high

**What & impact:** RFI communications and answers are not audited. There is no trail of when an RFI was raised, answered, or closed—useful for site communication history and dispute resolution.

**Evidence:** create() at line 122 and answer() at line 154 have NO AuditService.log() calls.

**Fix:** Inject AuditService. Call auditService.log() in create() with action 'RFI_CREATED', and in answer() with action 'RFI_ANSWERED', including metadata (subject, respondent, answer text).

### 72. 🟡 BOQ totalAmount can drift from quantity * unitRate if updated separately

**Module:** `surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/surveyor.service.ts:133` · **Confidence:** high

**What & impact:** BoqItem.totalAmount is denormalized (quantity * unitRate) and recalculated on every edit (line 133: `item.totalAmount = item.quantity * item.unitRate`). However, if quantity or unitRate changes in isolation via a direct MongoDB update, or if the recalculation is skipped in a future code path, totalAmount becomes inconsistent. The schema has a min:0 constraint but no formula-level guarantee.

**Evidence:** boq-item.schema.ts:34-36 - totalAmount is stored separately from quantity/unitRate without a database-level check. surveyor.service.ts:133 relies on application code to maintain the invariant.

**Fix:** Store only quantity and unitRate in the schema; compute totalAmount as a getter or always return calculated value from the API. If denormalization is required for performance, add a database-level trigger or use Mongoose pre-save hooks with a validation check to prevent drift.

### 73. 🟡 Variation impactAmount allows negative values but no validation that signed cost changes are correct

**Module:** `surveyor` · **Category:** Correctness · **Location:** `backend/src/modules/surveyor/schemas/variation.schema.ts:31` · **Confidence:** high

**What & impact:** Variation.impactAmount is a signed number (positive = addition, negative = deduction). The DTO allows any number via @IsNumber() without @Min/@Max, so a negative impactAmount intended as a deduction could be entered as a large negative number by mistake. There is no audit of whether the sign matches the semantic intent, and no rollback if a variation is rejected.

**Evidence:** variation.schema.ts:31 - `impactAmount: number` (no min/max). create-surveyor.dto.ts:27 - `impactAmount!: number;` (no @Min or @Max constraint). No business logic validates deductions do not exceed contract value.

**Fix:** Add @Min validation to DTO if only positive additions are allowed, or add separate 'type: ADDITION | DEDUCTION' enum field + validate sign consistency. Track cumulative impact per project and refuse variations that would reduce contract below zero or minimum value.

### 74. 🟡 No Soft-Delete Applied to Valuation Schema Despite Deletion Pattern in Surveyor Service

**Module:** `surveyor` · **Category:** Correctness · **Location:** `surveyor/schemas/valuation.schema.ts:1-51` · **Confidence:** high

**What & impact:** The Valuation schema does not apply softDeletePlugin (no `deletedAt` field, no plugin), but the Surveyor service may attempt to delete valuations. The inconsistency means valuations cannot be soft-deleted via the standard pattern. If read operations exist, they don't filter deleted valuations.

**Evidence:** Valuation schema at line 1-51 has no `deletedAt` field declaration and no `ValuationSchema.plugin(softDeletePlugin)`. Contrast with Variation schema at line 57 which has `VariationSchema.plugin(softDeletePlugin)` and `deletedAt: Date | null` field. Other schemas like Issue, Task, RFI all have soft-delete applied.

**Fix:** Add softDeletePlugin to Valuation: (1) add `deletedAt: Date | null` field to the class, (2) apply `ValuationSchema.plugin(softDeletePlugin)` after SchemaFactory.createForClass(). Then ensure all reads (findByProject, findAll) implicitly filter `deletedAt: null` via the plugin.

### 75. 🟡 Valuation certification has no notification or contract update hook

**Module:** `surveyor` · **Category:** Missing feature · **Location:** `surveyor/surveyor.service.ts:240-253` · **Confidence:** high

**What & impact:** When a valuation is certified (SUBMITTED → CERTIFIED), no downstream action occurs: (1) no notification to project billing or client, (2) no trigger to create a corresponding invoice, (3) no update to cumulative contract value. A certified valuation should activate downstream billing flows.

**Evidence:** certifyValuation() at line 240 updates status to CERTIFIED, sets certifiedById/certifiedAt, saves. No NotificationsService call, no BillingService.createInvoice() call, no Project.totalBudget update.

**Fix:** After valuation.save(): (1) notify project stakeholders 'Valuation for period {period} certified', type: 'VALUATION_CERTIFIED'; (2) Optionally trigger billingService.createInvoice() if a bridging API exists; (3) Update Project.totalValue or contract-value fields to reflect approved variations/valuations.

### 76. 🟡 Task status can be set to any value via generic update without state validation

**Module:** `tasks` · **Category:** Correctness · **Location:** `backend/src/modules/tasks/tasks.service.ts:124-157` · **Confidence:** high

**What & impact:** The update method allows the status field to be set to any value without enforcing legal state transitions. A TODO task can be jumped directly to DONE, or a DONE task can be reverted back to TODO or IN_PROGRESS. The intended flow is TODO → IN_PREPARATION → IN_PROGRESS → REVIEW → DONE, but the generic update allows any TaskStatus enum value. The code does set completedAt when status === DONE (line 149-153), but does not prevent illegal forward/backward jumps. A Kanban reorder endpoint (line 166-195) also enforces status per column, but the generic PATCH endpoint does not.

**Evidence:** update method (line 124-157): `if (dto.status !== undefined) task.status = dto.status;` directly assigns any status. CreateTaskDto allows status to be set at creation, and UpdateTaskDto (which extends CreateTaskDto) inherits this via PartialType. TaskStatus enum: TODO, IN_PREPARATION, IN_PROGRESS, BLOCKED, REVIEW, DONE. No transition rules are enforced. The code only sets completedAt when transitioning to DONE (line 150) but does not validate that DONE is the final state or that prior states have been visited.

**Fix:** Add a transition guard in the update method: Define a legal state machine (TODO → {IN_PREPARATION, BLOCKED}, IN_PREPARATION → {IN_PROGRESS, BLOCKED}, etc.). Check if (dto.status !== undefined && !isLegalTransition(task.status, dto.status)) { throw new BadRequestException('Illegal status transition'); }. Alternatively, remove status from UpdateTaskDto and create explicit endpoint(s) for status changes that enforce the Kanban column flow and prevent reopening DONE tasks.

### 77. 🟡 Task.startDate and Task.dueDate have no constraint (startDate can be after dueDate)

**Module:** `tasks` · **Category:** Correctness · **Location:** `backend/src/modules/projects/schemas/task.schema.ts:64-68 and tasks.service.ts:117-118` · **Confidence:** high

**What & impact:** Task schema and DTO allow startDate and dueDate to be set independently with no validation that startDate ≤ dueDate. A task can be created with a start date after its due date, which violates basic scheduling logic in construction project management.

**Evidence:** Task schema has separate @Prop for startDate and dueDate with no constraints. tasks.service.ts line 117-118: task.startDate = dto.startDate ? new Date(dto.startDate) : null; task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null — no validation.

**Fix:** In TasksService.create() and update(), validate: if (dto.startDate && dto.dueDate && new Date(dto.startDate) > new Date(dto.dueDate)) throw BadRequestException('Start date cannot be after due date').

### 78. 🟡 Task.dueDate can be set to a past date without warning or restriction

**Module:** `tasks` · **Category:** Correctness · **Location:** `backend/src/modules/projects/schemas/task.schema.ts:67-68 and tasks.service.ts:117-118` · **Confidence:** high

**What & impact:** Tasks can be created or updated with a dueDate in the past. While past due dates are sometimes necessary for backlog items or historical data, in active construction projects a dueDate should not be in the past for new tasks. No validation prevents this.

**Evidence:** TasksService.create() and update() accept any @IsDateString for dueDate without checking if it is >= today. No temporal validation is performed.

**Fix:** Add optional validation: if (dto.dueDate && new Date(dto.dueDate) < new Date().setHours(0, 0, 0, 0)) throw BadRequestException('Due date cannot be in the past'). Or log a warning and allow it for backlog/archival use cases, documented in comments.

---

## Refuted (6) — checked and dismissed

- **Material Request status can be manually set via update, bypassing required approval workflow** — `backend/src/modules/procurement/procurement.service.ts:310-327`  
  The finding is refuted by code inspection. (1) CreateMaterialRequestDto explicitly does not declare a status field; (2) UpdateMaterialRequestDto extends PartialType(CreateMaterialRequestDto), so status is not inherited; (3) Global ValidationPipe with whitelist:true, forbidNonWhitelisted:true rejects unknown fields, so sending status in the request body will cause a 400 error; (4) updateMaterialReq
- **Budget committed amount filter excludes DRAFT POs, missing procurement visibility** — `backend/src/modules/budget/budget.service.ts:191`  
  The finding correctly identifies that line 191 of budget.service.ts excludes DRAFT POs from committed budget calculations. However, this is not a bug but an intentional design choice aligned with accounting standards. "Committed" in procurement means SUBMITTED or APPROVED — DRAFT is internal work-in-progress with no supplier confirmation or legal obligation. The procurement module confirms this de
- **BOQ code uniqueness not enforced at project level; code collision across orgs possible** — `backend/src/modules/surveyor/surveyor.service.ts:105`  
  The finding claims updateBoqItem() does not re-check code uniqueness when the code is modified. However, examination of the code reveals this is not a real issue: (1) UpdateBoqItemDto is created via PartialType(CreateBoqItemDto), which makes all fields optional but the updateBoqItem() method at surveyor.service.ts:122-137 explicitly never reads or assigns dto.code. (2) The ValidationPipe in main.t
- **Missing PermissionsGuard on Notifications controller** — `notifications.controller.ts:1-26`  
  The NotificationsController does omit PermissionsGuard, but this is by design, not a vulnerability. All three endpoints filter by userId/organizationId to return only the authenticated user's own notifications. CLAUDE.md explicitly documents this pattern for user-scoped operations (e.g., PATCH /users/me has no @RequirePermissions because it uses user.sub). PermissionsGuard is not globally applied 
- **No enforcement that EstimatedHours and ActualHours are non-negative (schema allows but DTO validation may be weak)** — `backend/src/modules/projects/schemas/task.schema.ts:81-85 and tasks.service.ts:119, 145`  
  The finding is REFUTED. Code inspection shows: (1) Schema has min: 0 constraints on estimatedHours (task.schema.ts:81) and actualHours (task.schema.ts:84). (2) CreateTaskDto has @Min(0) on estimatedHours (create-task.dto.ts:51). (3) UpdateTaskDto extends PartialType(CreateTaskDto) and explicitly adds @Min(0) on actualHours (update-task.dto.ts:14), inheriting estimatedHours validation. (4) The glob
- **No Uniqueness Constraint on Valuation Period Per Project** — `surveyor/schemas/valuation.schema.ts:54`  
  The finding claims that Valuation has a soft-delete issue with its unique index. However, investigation shows: (1) Valuation schema does NOT have softDeletePlugin applied (no plugin call after SchemaFactory); (2) Valuation class does NOT declare a deletedAt field; (3) ValuationsController has no delete endpoint; (4) The createValuation check at surveyor.service.ts:216 uses a standard findOne query

---

## Cross-cutting themes

1. **Unguarded status fields are the #1 pattern.** Almost every entity (PO, delivery, variation, valuation, task, issue, RFI, invoice) exposes `status` on its generic PATCH/update with no transition guard — dedicated approve/certify endpoints validate state, but the generic update bypasses them. A shared `assertTransition(from,to,machine)` helper + removing `status` from update DTOs would close most correctness findings at once.
2. **Header totals are not derived from line items.** PO `totalAmount`, BOQ `totalAmount`, unit payment schedules can all drift from their components — these feed budget rollups, so wrong numbers propagate. Compute-on-write (or compute-on-read) instead of trusting client input.
3. **Multi-tenancy is mostly disciplined but has real holes.** The AI report-summary leak and `GET /users/:id` / billing `create` accept-from-body cases are genuine cross-org exposures — same class as the known AI leak. A lint rule / repository wrapper that forces `organizationId` on every by-id query would systematically prevent these.
4. **Permission semantics are inconsistent.** Several write endpoints are gated by READ permissions (support-tickets, tickets). Audit the full controller → permission matrix once.
5. **Financial controls lack audit + bounds.** Retention, variations, and expenses accept unbounded manual values with no audit-log entry and no domain caps — a problem for a system meant to be a financial system of record.

## Suggested remediation order

1. **Security first (6 criticals + the cross-org highs):** AI report-summary org filter, `GET /users/:id` org scoping, billing `create` org-from-token, PO total integrity. Small, high-impact.
2. **State-machine guard sweep:** one shared helper, applied across all 8 entities — knocks out the bulk of correctness findings.
3. **Total-integrity sweep:** derive PO/BOQ/payment totals from line items.
4. **Permission-matrix pass:** fix READ-gated writes, then a full controller audit.
5. **Missing-feature backlog:** triage the 28 missing-feature items against launch scope (most overlap the workflow-seam gaps in the go-live doc — progress billing, bid→award, change-order→contract-value).

*Full machine-readable results: workflow run `wf_075fe02e-955`. Re-validate file:line before acting — they drift.*
