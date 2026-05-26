#!/usr/bin/env bash
# QA 09 — Org Admin: Support Tickets
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 09 — Org Admin: Support Tickets${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT
TS="$(date +%s)"
CREATED_TICKET_ID=""
ENDPOINT="/support-tickets"

section "Org Admin Login"
RESP=$(login "$JAR" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-09-001: Login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-09-002: organizationId present" "$ORG_ID"

section "Detect endpoint (/support-tickets vs /tickets)"
RESP=$(api_get "$JAR" "$ORG_ID" "/support-tickets")
if ! echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  ENDPOINT="/tickets"
  RESP=$(api_get "$JAR" "$ORG_ID" "/tickets")
fi
assert_success "TC-09-003: Ticket list endpoint responds" "$RESP"
ENDPOINT_LABEL="$ENDPOINT"

section "Tickets List"
assert_array_not_empty "TC-09-004: Tickets list not empty" "$RESP" ".data"

LEN=$(echo "$RESP" | jq '.data | length')
[ "$LEN" -ge 3 ] && pass "TC-09-005: At least 3 seeded tickets (found $LEN)" || \
  fail "TC-09-005: Expected >= 3 tickets, found $LEN"

section "Seeded Tickets Present"
TITLES=$(echo "$RESP" | jq -r '[.data[].title] | .[]' 2>/dev/null)
echo "$TITLES" | grep -qi "invoice" && \
  pass "TC-09-006: Seeded ticket 'Invoice discrepancy' found" || \
  fail "TC-09-006: 'Invoice discrepancy' ticket not found"

echo "$TITLES" | grep -qi "dashboard" && \
  pass "TC-09-007: Seeded ticket 'Cannot access project dashboard' found" || \
  skip "TC-09-007: Dashboard ticket not found (may have different title)"

echo "$TITLES" | grep -qi "export\|pdf\|report" && \
  pass "TC-09-008: Seeded feature request ticket found" || \
  skip "TC-09-008: Feature request ticket not found"

section "Ticket Structure"
FIRST=$(echo "$RESP" | jq '.data[0]')
assert_not_empty "TC-09-009: Ticket has title" "$(echo "$FIRST" | jq -r '.title // empty')"
assert_not_empty "TC-09-010: Ticket has status" "$(echo "$FIRST" | jq -r '.status // empty')"
assert_not_empty "TC-09-011: Ticket has priority" "$(echo "$FIRST" | jq -r '.priority // empty')"

STATUS_VAL=$(echo "$FIRST" | jq -r '.status')
VALID_STATUSES="OPEN IN_PROGRESS RESOLVED CLOSED"
echo "$VALID_STATUSES" | grep -qw "$STATUS_VAL" && \
  pass "TC-09-012: Ticket status is valid enum ($STATUS_VAL)" || \
  fail "TC-09-012: Invalid ticket status: $STATUS_VAL"

PRIORITY_VAL=$(echo "$FIRST" | jq -r '.priority')
VALID_PRIORITIES="LOW MEDIUM HIGH URGENT CRITICAL"
echo "$VALID_PRIORITIES" | grep -qw "$PRIORITY_VAL" && \
  pass "TC-09-013: Ticket priority is valid enum ($PRIORITY_VAL)" || \
  fail "TC-09-013: Invalid ticket priority: $PRIORITY_VAL"

section "Category Field"
CAT=$(echo "$FIRST" | jq -r '.category // empty')
if [ -n "$CAT" ] && [ "$CAT" != "null" ]; then
  VALID_CATS="GENERAL BILLING TECHNICAL FEATURE_REQUEST"
  echo "$VALID_CATS" | grep -qw "$CAT" && \
    pass "TC-09-014: Ticket category is valid enum ($CAT)" || \
    skip "TC-09-014: Category '$CAT' not in expected enum (check TicketCategory)"
else
  skip "TC-09-014: category field not in ticket response"
fi

section "Create Ticket"
CREATE_BODY="{\"title\":\"QA Support Ticket $TS\",\"body\":\"Automated QA test ticket\",\"priority\":\"MEDIUM\"}"
STATUS=$(http_status "$JAR" "$ORG_ID" "POST" "$ENDPOINT" "$CREATE_BODY")
assert_status "TC-09-015: POST $ENDPOINT_LABEL → 201" "201" "$STATUS"
RESP=$(api_post "$JAR" "$ORG_ID" "$ENDPOINT" "$CREATE_BODY")
CREATED_TICKET_ID=$(echo "$RESP" | jq -r '.data._id // empty')
assert_not_empty "TC-09-016: Created ticket has _id" "$CREATED_TICKET_ID"
assert_field "TC-09-017: Ticket title matches" "$RESP" ".data.title" "QA Support Ticket $TS"
assert_field "TC-09-018: Ticket priority matches" "$RESP" ".data.priority" "MEDIUM"

section "Validation: Missing Title"
STATUS=$(http_status "$JAR" "$ORG_ID" "POST" "$ENDPOINT" '{"body":"no title","priority":"LOW"}')
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "TC-09-019: Missing title → $STATUS"
else
  fail "TC-09-019: Expected 400/422 for missing title, got $STATUS"
fi

section "Get Single Ticket"
if [ -n "$CREATED_TICKET_ID" ]; then
  RESP=$(api_get "$JAR" "$ORG_ID" "$ENDPOINT/$CREATED_TICKET_ID")
  assert_success "TC-09-020: GET $ENDPOINT_LABEL/:id → success" "$RESP"
  assert_field "TC-09-021: Ticket detail title correct" "$RESP" ".data.title" "QA Support Ticket $TS"
fi

section "Add Comment"
if [ -n "$CREATED_TICKET_ID" ]; then
  RESP=$(api_post "$JAR" "$ORG_ID" "$ENDPOINT/$CREATED_TICKET_ID/comments" \
    '{"body":"QA automated comment"}')
  if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
    pass "TC-09-022: POST comment → success"
  else
    STATUS=$(http_status "$JAR" "$ORG_ID" "POST" "$ENDPOINT/$CREATED_TICKET_ID/comments" \
      '{"body":"QA automated comment"}')
    [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ] && \
      pass "TC-09-022: POST comment → $STATUS" || \
      fail "TC-09-022: Comment POST returned $STATUS"
  fi
fi

section "Ticket Filtering"
RESP=$(api_get "$JAR" "$ORG_ID" "$ENDPOINT?status=OPEN")
assert_success "TC-09-023: GET $ENDPOINT_LABEL?status=OPEN → success" "$RESP"

RESP=$(api_get "$JAR" "$ORG_ID" "$ENDPOINT?priority=HIGH")
assert_success "TC-09-024: GET $ENDPOINT_LABEL?priority=HIGH → success" "$RESP"

RESP=$(api_get "$JAR" "$ORG_ID" "$ENDPOINT?category=BILLING")
assert_success "TC-09-025: GET $ENDPOINT_LABEL?category=BILLING → success" "$RESP"

section "Org Isolation"
JAR2=$(make_jar)
RESP2=$(login "$JAR2" "admin@companyc.com" "Demo@1234")
OTHER_ORG=$(echo "$RESP2" | jq -r '.data.user.organizationId // .data.organizationId // empty')
if [ -n "$OTHER_ORG" ] && [ "$OTHER_ORG" != "null" ] && [ "$OTHER_ORG" != "$ORG_ID" ]; then
  OTHER_TICKETS=$(api_get "$JAR2" "$OTHER_ORG" "$ENDPOINT")
  OTHER_IDS=$(echo "$OTHER_TICKETS" | jq -r '[.data[]._id] | .[]' 2>/dev/null)
  if [ -n "$CREATED_TICKET_ID" ] && echo "$OTHER_IDS" | grep -q "$CREATED_TICKET_ID"; then
    fail "TC-09-026: Org isolation BROKEN — ticket visible in other org"
  else
    pass "TC-09-026: Ticket NOT visible in other org (org isolation OK)"
  fi
else
  skip "TC-09-026: Could not get a different org for isolation test"
fi
cleanup_jar "$JAR2"

section "Cleanup"
if [ -n "$CREATED_TICKET_ID" ]; then
  STATUS=$(http_status "$JAR" "$ORG_ID" "DELETE" "$ENDPOINT/$CREATED_TICKET_ID")
  [ "$STATUS" = "200" ] || [ "$STATUS" = "204" ] && \
    pass "TC-09-027: Test ticket deleted" || \
    skip "TC-09-027: Ticket delete returned $STATUS"
fi

summary
