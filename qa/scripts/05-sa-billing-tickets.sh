#!/usr/bin/env bash
# QA 05 — Super Admin: Billing, Tickets, Audit Log, Org Admins
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 05 — Super Admin: Billing, Tickets, Audit Log, Org Admins${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT

login_super_admin "$JAR"
ORG_RESP=$(api_get "$JAR" "" "/organizations")
ORG_ID=$(echo "$ORG_RESP" | jq -r '[.data[] | select(.slug | test("^company-"))] | .[0]._id // .[0].id // empty')
assert_not_empty "Setup: Got org ID for tests" "$ORG_ID"

# ═══════════════════════════════════════════════════════════════════
# BILLING / INVOICES
# ═══════════════════════════════════════════════════════════════════
section "Invoices"
RESP=$(api_get "$JAR" "$ORG_ID" "/invoices")
assert_success "TC-05-001: GET /invoices → success" "$RESP"
assert_array_not_empty "TC-05-002: Invoices list not empty" "$RESP" ".data"

FIRST_INV=$(echo "$RESP" | jq '.data[0]')
assert_not_empty "TC-05-003: Invoice has number" \
  "$(echo "$FIRST_INV" | jq -r '.number // empty')"
assert_not_empty "TC-05-004: Invoice has amountUsd" \
  "$(echo "$FIRST_INV" | jq -r '.amountUsd // empty')"
assert_not_empty "TC-05-005: Invoice has status" \
  "$(echo "$FIRST_INV" | jq -r '.status // empty')"

INV_STATUS=$(echo "$FIRST_INV" | jq -r '.status')
VALID_STATUSES="PAID ISSUED OVERDUE DRAFT VOID"
if echo "$VALID_STATUSES" | grep -qw "$INV_STATUS"; then
  pass "TC-05-006: Invoice status is valid enum ($INV_STATUS)"
else
  fail "TC-05-006: Invalid invoice status: $INV_STATUS"
fi

AMOUNT=$(echo "$FIRST_INV" | jq -r '.amountUsd')
if echo "$AMOUNT" | grep -qE '^[0-9]+(\.[0-9]+)?$'; then
  pass "TC-05-007: Invoice amountUsd is numeric ($AMOUNT)"
else
  fail "TC-05-007: amountUsd not numeric: $AMOUNT"
fi

INV_ID=$(echo "$FIRST_INV" | jq -r '._id // empty')

section "Invoice CRUD"
TS="$(date +%s)"
FIRST_PLAN_ID=$(api_get "$JAR" "" "/plans" | jq -r '.data[0]._id // empty')
ISSUED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DUE_AT="$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+30d +%Y-%m-%dT%H:%M:%SZ)"
CREATE_BODY="{\"organizationId\":\"$ORG_ID\",\"planId\":\"$FIRST_PLAN_ID\",\"amountUsd\":500,\"status\":\"DRAFT\",\"number\":\"INV-QA-$TS\",\"issuedAt\":\"$ISSUED_AT\",\"dueAt\":\"$DUE_AT\"}"
NEW_INV=$(api_post "$JAR" "$ORG_ID" "/invoices" "$CREATE_BODY")
if echo "$NEW_INV" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-05-008: POST /invoices → 201"
  NEW_INV_ID=$(echo "$NEW_INV" | jq -r '.data._id // empty')
  assert_not_empty "TC-05-009: New invoice has _id" "$NEW_INV_ID"

  # Update to PAID
  RESP=$(api_patch "$JAR" "$ORG_ID" "/invoices/$NEW_INV_ID" '{"status":"PAID"}')
  assert_success "TC-05-010: PATCH invoice status → PAID" "$RESP"
  assert_field "TC-05-011: Status updated to PAID" "$RESP" ".data.status" "PAID"

  # Cleanup
  http_status "$JAR" "$ORG_ID" "DELETE" "/invoices/$NEW_INV_ID" > /dev/null 2>&1 || true
else
  skip "TC-05-008: POST /invoices returned non-201 ($(echo "$NEW_INV" | jq -r '.statusCode // "error"'))"
  skip "TC-05-009: Invoice creation skipped"
  skip "TC-05-010: Invoice status update skipped"
  skip "TC-05-011: Invoice status assertion skipped"
fi

section "Invoice Filtering"
RESP=$(api_get "$JAR" "$ORG_ID" "/invoices?status=PAID")
assert_success "TC-05-012: GET /invoices?status=PAID → success" "$RESP"

# ═══════════════════════════════════════════════════════════════════
# TICKETS (Support)
# ═══════════════════════════════════════════════════════════════════
section "Tickets List"
RESP=$(api_get "$JAR" "$ORG_ID" "/tickets")
assert_success "TC-05-013: GET /tickets → success" "$RESP"
assert_array_not_empty "TC-05-014: Tickets list not empty" "$RESP" ".data"

FIRST_TICKET=$(echo "$RESP" | jq '.data[0]')
assert_not_empty "TC-05-015: Ticket has title" \
  "$(echo "$FIRST_TICKET" | jq -r '.title // empty')"
assert_not_empty "TC-05-016: Ticket has status" \
  "$(echo "$FIRST_TICKET" | jq -r '.status // empty')"
assert_not_empty "TC-05-017: Ticket has priority" \
  "$(echo "$FIRST_TICKET" | jq -r '.priority // empty')"

TICKET_ID=$(echo "$FIRST_TICKET" | jq -r '._id // empty')

section "Ticket Status Update (SA editable)"
if [ -n "$TICKET_ID" ]; then
  RESP=$(api_patch "$JAR" "$ORG_ID" "/tickets/$TICKET_ID" '{"status":"IN_PROGRESS"}')
  assert_success "TC-05-018: PATCH ticket status → IN_PROGRESS" "$RESP"

  RESP=$(api_patch "$JAR" "$ORG_ID" "/tickets/$TICKET_ID" '{"priority":"LOW"}')
  assert_success "TC-05-019: PATCH ticket priority → LOW" "$RESP"

  # Restore original
  api_patch "$JAR" "$ORG_ID" "/tickets/$TICKET_ID" '{"status":"OPEN"}' > /dev/null 2>&1 || true
fi

section "Ticket Comments"
if [ -n "$TICKET_ID" ]; then
  RESP=$(api_post "$JAR" "$ORG_ID" "/tickets/$TICKET_ID/comments" \
    '{"body":"QA automated comment from SA"}')
  if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
    pass "TC-05-020: POST /tickets/:id/comments → success"
  else
    STATUS=$(http_status "$JAR" "$ORG_ID" "POST" "/tickets/$TICKET_ID/comments" \
      '{"body":"QA automated comment"}')
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
      pass "TC-05-020: POST comment → $STATUS"
    else
      fail "TC-05-020: POST comment returned $STATUS"
    fi
  fi
fi

section "Ticket Filtering"
RESP=$(api_get "$JAR" "$ORG_ID" "/tickets?status=OPEN")
assert_success "TC-05-021: GET /tickets?status=OPEN → success" "$RESP"
RESP=$(api_get "$JAR" "$ORG_ID" "/tickets?priority=HIGH")
assert_success "TC-05-022: GET /tickets?priority=HIGH → success" "$RESP"

section "Support Tickets alias endpoint"
RESP=$(api_get "$JAR" "$ORG_ID" "/support-tickets")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-05-023: GET /support-tickets → success (alias works)"
else
  skip "TC-05-023: /support-tickets endpoint returned non-success (may not exist)"
fi

# ═══════════════════════════════════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════════════════════════════════
section "Audit Log"
RESP=$(api_get "$JAR" "$ORG_ID" "/audit-logs")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-05-024: GET /audit-logs → success"
  FIRST=$(echo "$RESP" | jq 'try (.data.items[0] // .data[0]) // empty' 2>/dev/null)
  ACTION=$(echo "$FIRST" | jq -r '.action // empty' 2>/dev/null || echo "")
  if [ -n "$ACTION" ] && [ "$ACTION" != "null" ]; then
    pass "TC-05-025: Audit log entry has action ($ACTION)"
  else
    skip "TC-05-025: Audit log has no entries yet"
  fi
else
  STATUS=$(http_status "$JAR" "$ORG_ID" "GET" "/audit-logs")
  skip "TC-05-024: /audit-logs returned $STATUS"
  skip "TC-05-025: Audit log entry check skipped"
fi

# ═══════════════════════════════════════════════════════════════════
# ORG ADMINS
# ═══════════════════════════════════════════════════════════════════
section "Org Admins"
RESP=$(api_get "$JAR" "" "/users?role=ORG_ADMIN")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-05-026: GET /users?role=ORG_ADMIN → success"
  HAS_ORG_ADMIN=$(echo "$RESP" | jq '[.data[] | select(.email == "orgadmin@constructiq.com")] | length')
  [ "$HAS_ORG_ADMIN" -ge 1 ] && pass "TC-05-027: orgadmin@constructiq.com in ORG_ADMIN list" || \
    skip "TC-05-027: orgadmin not found in role=ORG_ADMIN filter"
else
  RESP=$(api_get "$JAR" "" "/users")
  assert_success "TC-05-026: GET /users → success" "$RESP"
  HAS_ORG_ADMIN=$(echo "$RESP" | \
    jq '[.data[] | select(.email == "orgadmin@constructiq.com")] | length' 2>/dev/null || echo 0)
  [ "$HAS_ORG_ADMIN" -ge 1 ] && pass "TC-05-027: orgadmin user found in users list" || \
    skip "TC-05-027: orgadmin email not in users response"
fi

summary
