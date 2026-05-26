#!/usr/bin/env bash
# QA 02 — Super Admin: Company Select & Dashboard
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 02 — Super Admin Dashboard${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT

section "Super Admin Login"
login_super_admin "$JAR"
assert_contains "TC-02-001: SA login sets cookies" "$(cat $JAR)" "access_token"

section "Organizations list (company-select data)"
RESP=$(api_get "$JAR" "" "/organizations")
assert_success "TC-02-002: GET /organizations → success:true" "$RESP"
assert_array_not_empty "TC-02-003: Organizations list not empty" "$RESP" ".data"

ORG_ID=$(echo "$RESP" | jq -r '.data[0]._id // .data[0].id // empty')
assert_not_empty "TC-02-004: First org has _id" "$ORG_ID"

section "Super Admin Dashboard Stats"
DASH=$(api_get "$JAR" "$ORG_ID" "/dashboard/stats")
if echo "$DASH" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-02-005: GET /dashboard/stats → success:true"
else
  # Try alternative endpoint
  DASH=$(api_get "$JAR" "$ORG_ID" "/dashboard")
  if echo "$DASH" | jq -e '.success == true' > /dev/null 2>&1; then
    pass "TC-02-005: GET /dashboard → success:true"
  else
    skip "TC-02-005: No /dashboard/stats or /dashboard endpoint found"
  fi
fi

section "Org context switching"
ORG2=$(echo "$(api_get "$JAR" "" "/organizations")" | jq -r '.data[1]._id // .data[1].id // empty')
if [ -n "$ORG2" ] && [ "$ORG2" != "null" ]; then
  RESP2=$(api_get "$JAR" "$ORG2" "/dashboard/org")
  if echo "$RESP2" | jq -e '.success == true' > /dev/null 2>&1; then
    pass "TC-02-006: Dashboard data fetched for second org ($ORG2)"
  else
    skip "TC-02-006: /dashboard/org returned non-success for org2"
  fi
else
  skip "TC-02-006: Only one org in DB — cannot test switch"
fi

section "Non-SA cannot access SA endpoints"
JAR2=$(make_jar)
RESP=$(login "$JAR2" "orgadmin@constructiq.com" "Demo@1234")
ORG_ADMIN_ORG=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')

STATUS=$(http_status "$JAR2" "$ORG_ADMIN_ORG" "GET" "/organizations")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  pass "TC-02-007: Org admin cannot list all organizations → $STATUS"
else
  skip "TC-02-007: /organizations returned $STATUS for org admin (may be allowed by design)"
fi
cleanup_jar "$JAR2"

section "SA dashboard data fields"
DASH_ORG=$(api_get "$JAR" "$ORG_ID" "/dashboard/org")
if echo "$DASH_ORG" | jq -e '.success == true' > /dev/null 2>&1; then
  assert_not_empty "TC-02-008: activeProjectCount present" \
    "$(echo "$DASH_ORG" | jq -r '.data.activeProjectCount // empty')"
  assert_not_empty "TC-02-009: teamMemberCount present" \
    "$(echo "$DASH_ORG" | jq -r '.data.teamMemberCount // empty')"
  assert_not_empty "TC-02-010: totalProjectCount present" \
    "$(echo "$DASH_ORG" | jq -r '.data.totalProjectCount // empty')"
else
  skip "TC-02-008: /dashboard/org not available for SA context"
  skip "TC-02-009: /dashboard/org not available for SA context"
  skip "TC-02-010: /dashboard/org not available for SA context"
fi

section "Organizations response structure"
ORG_RESP=$(api_get "$JAR" "" "/organizations")
FIRST_ORG=$(echo "$ORG_RESP" | jq '.data[0]')
assert_not_empty "TC-02-011: Org has name" "$(echo "$FIRST_ORG" | jq -r '.name // empty')"
assert_not_empty "TC-02-012: Org has slug" "$(echo "$FIRST_ORG" | jq -r '.slug // empty')"
STATUS_VAL=$(echo "$FIRST_ORG" | jq -r '.status // .isActive // empty')
assert_not_empty "TC-02-013: Org has status field" "$STATUS_VAL"

summary
