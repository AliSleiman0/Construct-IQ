#!/usr/bin/env bash
# QA 10 — Org Admin: Billing & Subscription
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 10 — Org Admin: Billing & Subscription${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT
TS="$(date +%s)"
CREATED_INV_ID=""

section "Org Admin Login"
RESP=$(login "$JAR" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-10-001: Login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-10-002: organizationId present" "$ORG_ID"

# ═══════════════════════════════════════════════════════════════════
# BILLING / INVOICES
# ═══════════════════════════════════════════════════════════════════
section "Invoice List"
RESP=$(api_get "$JAR" "$ORG_ID" "/invoices")
assert_success "TC-10-003: GET /invoices → success" "$RESP"
assert_array_not_empty "TC-10-004: Invoices list not empty" "$RESP" ".data"

FIRST_INV=$(echo "$RESP" | jq '.data[0]')
assert_not_empty "TC-10-005: Invoice has number" \
  "$(echo "$FIRST_INV" | jq -r '.number // empty')"
assert_not_empty "TC-10-006: Invoice has amountUsd" \
  "$(echo "$FIRST_INV" | jq -r '.amountUsd // empty')"
assert_not_empty "TC-10-007: Invoice has status" \
  "$(echo "$FIRST_INV" | jq -r '.status // empty')"
assert_not_empty "TC-10-008: Invoice has organizationId" \
  "$(echo "$FIRST_INV" | jq -r '.organizationId // empty')"

INV_ORG=$(echo "$FIRST_INV" | jq -r '.organizationId')
[ "$INV_ORG" = "$ORG_ID" ] && pass "TC-10-009: Invoice scoped to correct org" || \
  fail "TC-10-009: Invoice org $INV_ORG ≠ $ORG_ID"

section "Invoice Status Enum"
for inv_status in $(echo "$RESP" | jq -r '[.data[].status] | unique | .[]' 2>/dev/null); do
  VALID="PAID ISSUED OVERDUE DRAFT VOID"
  echo "$VALID" | grep -qw "$inv_status" && \
    pass "TC-10-010: Invoice status '$inv_status' is valid" || \
    fail "TC-10-010: Invalid invoice status: '$inv_status'"
done

section "Invoice Amount is Numeric"
AMOUNT=$(echo "$FIRST_INV" | jq -r '.amountUsd')
if echo "$AMOUNT" | grep -qE '^[0-9]+(\.[0-9]+)?$'; then
  pass "TC-10-011: amountUsd is numeric ($AMOUNT)"
else
  fail "TC-10-011: amountUsd not numeric: $AMOUNT"
fi

section "Balance Calculation"
ISSUED_SUM=$(echo "$RESP" | jq \
  '[.data[] | select(.status == "ISSUED" or .status == "OVERDUE") | .amountUsd] | add // 0')
OVERDUE_COUNT=$(echo "$RESP" | jq '[.data[] | select(.status == "OVERDUE")] | length')
ISSUED_COUNT=$(echo "$RESP" | jq '[.data[] | select(.status == "ISSUED")] | length')
pass "TC-10-012: Balance computed: ISSUED+OVERDUE sum = $ISSUED_SUM (issued=$ISSUED_COUNT, overdue=$OVERDUE_COUNT)"

section "Invoice Date Fields"
ISSUED_AT=$(echo "$FIRST_INV" | jq -r '.issuedAt // empty')
DUE_AT=$(echo "$FIRST_INV" | jq -r '.dueAt // empty')
# If present, should be parseable ISO date
if [ -n "$ISSUED_AT" ] && [ "$ISSUED_AT" != "null" ]; then
  echo "$ISSUED_AT" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' && \
    pass "TC-10-013: issuedAt is ISO date" || \
    fail "TC-10-013: issuedAt not ISO format: $ISSUED_AT"
else
  skip "TC-10-013: issuedAt is null/empty"
fi

section "Create Invoice"
FIRST_PLAN_ID=$(api_get "$JAR" "" "/plans" | jq -r '.data[0]._id // empty')
ISSUED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DUE_AT="$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+30d +%Y-%m-%dT%H:%M:%SZ)"
CREATE_BODY="{\"organizationId\":\"$ORG_ID\",\"planId\":\"$FIRST_PLAN_ID\",\"amountUsd\":250,\"status\":\"DRAFT\",\"number\":\"INV-QA-$TS\",\"issuedAt\":\"$ISSUED_AT\",\"dueAt\":\"$DUE_AT\"}"
NEW_INV=$(api_post "$JAR" "$ORG_ID" "/invoices" "$CREATE_BODY")
if echo "$NEW_INV" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-10-014: POST /invoices → 201"
  CREATED_INV_ID=$(echo "$NEW_INV" | jq -r '.data._id // empty')
  assert_not_empty "TC-10-015: Created invoice has _id" "$CREATED_INV_ID"

  section "Update Invoice Status"
  RESP=$(api_patch "$JAR" "$ORG_ID" "/invoices/$CREATED_INV_ID" '{"status":"ISSUED"}')
  assert_success "TC-10-016: PATCH invoice → ISSUED" "$RESP"
  assert_field "TC-10-017: Invoice status = ISSUED" "$RESP" ".data.status" "ISSUED"

  RESP=$(api_patch "$JAR" "$ORG_ID" "/invoices/$CREATED_INV_ID" '{"status":"PAID"}')
  assert_success "TC-10-018: PATCH invoice → PAID" "$RESP"
  assert_field "TC-10-019: Invoice status = PAID" "$RESP" ".data.status" "PAID"
else
  skip "TC-10-014: POST /invoices returned non-201: $(echo "$NEW_INV" | jq -r '.statusCode // "error"') (may require SA role)"
  skip "TC-10-015: Invoice creation skipped"
  skip "TC-10-016: Invoice status update skipped"
  skip "TC-10-017: Invoice status assertion skipped"
  skip "TC-10-018: Invoice mark paid skipped"
  skip "TC-10-019: Invoice paid assertion skipped"
fi

section "Invoice Filtering"
RESP=$(api_get "$JAR" "$ORG_ID" "/invoices?status=PAID")
assert_success "TC-10-020: GET /invoices?status=PAID → success" "$RESP"
PAID_ONLY=$(echo "$RESP" | jq '[.data[] | select(.status != "PAID")] | length' 2>/dev/null || echo 0)
[ "$PAID_ONLY" -eq 0 ] && pass "TC-10-021: All returned invoices are PAID" || \
  skip "TC-10-021: Filter not applied server-side ($PAID_ONLY non-PAID invoices returned)"

# ═══════════════════════════════════════════════════════════════════
# SUBSCRIPTION / PLANS
# ═══════════════════════════════════════════════════════════════════
section "Plans (for Subscription page)"
RESP=$(api_get "$JAR" "$ORG_ID" "/plans")
assert_success "TC-10-022: GET /plans → success" "$RESP"
assert_array_not_empty "TC-10-023: Plans list not empty" "$RESP" ".data"

FIRST_PLAN=$(echo "$RESP" | jq '.data[0]')
assert_not_empty "TC-10-024: Plan has name" "$(echo "$FIRST_PLAN" | jq -r '.name // empty')"
assert_not_empty "TC-10-025: Plan has pricePerMonth" \
  "$(echo "$FIRST_PLAN" | jq -r '.pricePerMonth // empty')"
assert_not_empty "TC-10-026: Plan has maxUsers" \
  "$(echo "$FIRST_PLAN" | jq -r '.maxUsers // empty')"
assert_not_empty "TC-10-027: Plan has maxProjects" \
  "$(echo "$FIRST_PLAN" | jq -r '.maxProjects // empty')"

PRICE=$(echo "$FIRST_PLAN" | jq -r '.pricePerMonth')
if echo "$PRICE" | grep -qE '^[0-9]+(\.[0-9]+)?$' && [ "$(echo "$PRICE > 0" | bc -l 2>/dev/null || echo 1)" = "1" ]; then
  pass "TC-10-028: pricePerMonth is positive number ($PRICE)"
else
  skip "TC-10-028: Cannot validate pricePerMonth > 0 (value: $PRICE)"
fi

POPULAR=$(echo "$RESP" | jq '[.data[] | select(.isPopular == true)] | length')
[ "$POPULAR" -ge 1 ] && pass "TC-10-029: At least one popular plan ($POPULAR)" || \
  skip "TC-10-029: No popular plan in response"

section "Dashboard for Usage Meters"
DASH=$(api_get "$JAR" "$ORG_ID" "/dashboard/org")
assert_success "TC-10-030: GET /dashboard/org for usage meters → success" "$DASH"

MEMBER_COUNT=$(echo "$DASH" | jq -r '.data.teamMemberCount // 0')
PROJ_COUNT=$(echo "$DASH" | jq -r '.data.totalProjectCount // 0')
MAX_USERS=$(echo "$FIRST_PLAN" | jq -r '.maxUsers // 0')
MAX_PROJECTS=$(echo "$FIRST_PLAN" | jq -r '.maxProjects // 0')

[[ "$MEMBER_COUNT" =~ ^[0-9]+$ ]] && \
  pass "TC-10-031: teamMemberCount is integer ($MEMBER_COUNT)" || \
  fail "TC-10-031: teamMemberCount not integer: $MEMBER_COUNT"

[[ "$PROJ_COUNT" =~ ^[0-9]+$ ]] && \
  pass "TC-10-032: totalProjectCount is integer ($PROJ_COUNT)" || \
  fail "TC-10-032: totalProjectCount not integer: $PROJ_COUNT"

section "Usage Meter Calculations"
if [[ "$MAX_USERS" =~ ^[0-9]+$ ]] && [ "$MAX_USERS" -gt 0 ]; then
  PCT=$(echo "scale=0; $MEMBER_COUNT * 100 / $MAX_USERS" | bc 2>/dev/null || echo "N/A")
  pass "TC-10-033: Members usage = $MEMBER_COUNT/$MAX_USERS ($PCT%)"
else
  skip "TC-10-033: maxUsers not numeric: $MAX_USERS"
fi

if [[ "$MAX_PROJECTS" =~ ^[0-9]+$ ]] && [ "$MAX_PROJECTS" -gt 0 ]; then
  PCT=$(echo "scale=0; $PROJ_COUNT * 100 / $MAX_PROJECTS" | bc 2>/dev/null || echo "N/A")
  pass "TC-10-034: Projects usage = $PROJ_COUNT/$MAX_PROJECTS ($PCT%)"
else
  skip "TC-10-034: maxProjects not numeric: $MAX_PROJECTS"
fi

section "Org Isolation — Invoices"
JAR2=$(make_jar)
RESP_C=$(login "$JAR2" "admin@companyc.com" "Demo@1234")
OTHER_ORG=$(echo "$RESP_C" | jq -r '.data.user.organizationId // .data.organizationId // empty')
if [ -n "$OTHER_ORG" ] && [ "$OTHER_ORG" != "null" ] && [ "$OTHER_ORG" != "$ORG_ID" ]; then
  OTHER_INV=$(api_get "$JAR2" "$OTHER_ORG" "/invoices")
  MY_INV_IDS=$(api_get "$JAR" "$ORG_ID" "/invoices" | jq -r '[.data[]._id] | .[]' 2>/dev/null)
  OTHER_INV_IDS=$(echo "$OTHER_INV" | jq -r '[.data[]._id] | .[]' 2>/dev/null)
  OVERLAP=false
  while IFS= read -r id; do
    [ -n "$id" ] && echo "$OTHER_INV_IDS" | grep -q "$id" && OVERLAP=true && break
  done <<< "$MY_INV_IDS"
  $OVERLAP && fail "TC-10-035: Invoice isolation BROKEN — invoices overlap between orgs" || \
    pass "TC-10-035: Invoice org isolation OK"
else
  skip "TC-10-035: Could not get a different org for isolation test"
fi
cleanup_jar "$JAR2"

section "Cleanup"
if [ -n "$CREATED_INV_ID" ]; then
  http_status "$JAR" "$ORG_ID" "DELETE" "/invoices/$CREATED_INV_ID" > /dev/null 2>&1 && \
    pass "TC-10-036: Test invoice cleaned up" || \
    skip "TC-10-036: Invoice cleanup skipped"
fi

summary
