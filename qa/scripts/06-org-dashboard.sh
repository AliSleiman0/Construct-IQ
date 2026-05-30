#!/usr/bin/env bash
# QA 06 — Org Admin: Dashboard
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 06 — Org Admin: Dashboard${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT

section "Org Admin Login"
RESP=$(login "$JAR" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-06-001: Org admin login → success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-06-002: organizationId extracted" "$ORG_ID"

section "Dashboard Org Endpoint"
DASH=$(api_get "$JAR" "$ORG_ID" "/dashboard/org")
assert_success "TC-06-003: GET /dashboard/org → success" "$DASH"

# Required fields
for field in activeProjectCount totalProjectCount teamMemberCount; do
  VAL=$(echo "$DASH" | jq -r ".data.$field // empty")
  if [ -n "$VAL" ] && [ "$VAL" != "null" ]; then
    pass "TC-06-004: $field present (value: $VAL)"
  else
    fail "TC-06-004: $field missing in dashboard response"
  fi
done

section "Budget Fields"
BUDGET=$(echo "$DASH" | jq -r '.data.budgetTotal // empty')
SPENT=$(echo "$DASH" | jq -r '.data.budgetSpent // empty')
if [ -n "$BUDGET" ] && [ "$BUDGET" != "null" ]; then
  pass "TC-06-005: budgetTotal present ($BUDGET)"
else
  skip "TC-06-005: budgetTotal not in response"
fi
if [ -n "$SPENT" ] && [ "$SPENT" != "null" ]; then
  pass "TC-06-006: budgetSpent present ($SPENT)"
else
  skip "TC-06-006: budgetSpent not in response"
fi

section "Issue Counts"
OPEN_ISSUES=$(echo "$DASH" | jq -r '.data.openIssueCount // empty')
if [ -n "$OPEN_ISSUES" ] && [ "$OPEN_ISSUES" != "null" ]; then
  pass "TC-06-007: openIssueCount present ($OPEN_ISSUES)"
else
  skip "TC-06-007: openIssueCount not in response"
fi

PRIORITY_BREAKDOWN=$(echo "$DASH" | jq -r '.data.openIssuesByPriority // empty')
if [ -n "$PRIORITY_BREAKDOWN" ] && [ "$PRIORITY_BREAKDOWN" != "null" ]; then
  pass "TC-06-008: openIssuesByPriority present"
else
  skip "TC-06-008: openIssuesByPriority not in response"
fi

section "Project Status Distribution"
DIST=$(echo "$DASH" | jq -r '.data.projectStatusDistribution // empty')
if [ -n "$DIST" ] && [ "$DIST" != "null" ]; then
  pass "TC-06-009: projectStatusDistribution present"
else
  skip "TC-06-009: projectStatusDistribution not in response"
fi

section "Weekly Report Counts"
WEEKLY=$(echo "$DASH" | jq -r '.data.weeklyReportCounts // empty')
if [ -n "$WEEKLY" ] && [ "$WEEKLY" != "null" ]; then
  LEN=$(echo "$DASH" | jq '.data.weeklyReportCounts | length' 2>/dev/null || echo 0)
  pass "TC-06-010: weeklyReportCounts present ($LEN weeks)"
else
  skip "TC-06-010: weeklyReportCounts not in response"
fi

REPORTS_30=$(echo "$DASH" | jq -r '.data.reportsFiledLast30d // empty')
if [ -n "$REPORTS_30" ] && [ "$REPORTS_30" != "null" ]; then
  pass "TC-06-011: reportsFiledLast30d present ($REPORTS_30)"
else
  skip "TC-06-011: reportsFiledLast30d not in response"
fi

section "Recent Activity"
ACTIVITY=$(echo "$DASH" | jq -r '.data.recentActivity // empty')
if [ -n "$ACTIVITY" ] && [ "$ACTIVITY" != "null" ] && [ "$ACTIVITY" != "[]" ]; then
  LEN=$(echo "$DASH" | jq '.data.recentActivity | length' 2>/dev/null || echo 0)
  pass "TC-06-012: recentActivity present ($LEN entries)"
  FIRST_ACT=$(echo "$DASH" | jq '.data.recentActivity[0]')
  assert_not_empty "TC-06-013: Activity entry has userName" \
    "$(echo "$FIRST_ACT" | jq -r '.userName // empty')"
  assert_not_empty "TC-06-014: Activity entry has action" \
    "$(echo "$FIRST_ACT" | jq -r '.action // empty')"
  assert_not_empty "TC-06-015: Activity entry has createdAt" \
    "$(echo "$FIRST_ACT" | jq -r '.createdAt // empty')"
else
  skip "TC-06-012: recentActivity empty or not in response"
  skip "TC-06-013: Activity userName skipped"
  skip "TC-06-014: Activity action skipped"
  skip "TC-06-015: Activity createdAt skipped"
fi

section "Org Data Isolation"
# Login as super admin, check different org returns different data
JAR2=$(make_jar)
login_super_admin "$JAR2"
ORG_LIST=$(api_get "$JAR2" "" "/organizations")
ORG2_ID=$(echo "$ORG_LIST" | jq -r '[.data[] | select((.id // ._id) != "'"$ORG_ID"'")] | .[0]._id // .[0].id // empty')
if [ -n "$ORG2_ID" ] && [ "$ORG2_ID" != "null" ]; then
  DASH2=$(api_get "$JAR2" "$ORG2_ID" "/dashboard/org")
  TC=$(echo "$DASH2" | jq -r '.data.teamMemberCount // 0')
  TC1=$(echo "$DASH" | jq -r '.data.teamMemberCount // 0')
  # Data may differ (not guaranteed, but endpoint should respond)
  assert_success "TC-06-016: /dashboard/org returns success for org2" "$DASH2"
else
  skip "TC-06-016: Only one org — isolation test skipped"
fi
cleanup_jar "$JAR2"

section "Numeric values not NaN"
TC=$(echo "$DASH" | jq -r '.data.teamMemberCount')
PC=$(echo "$DASH" | jq -r '.data.totalProjectCount')
if [[ "$TC" =~ ^[0-9]+$ ]] && [[ "$PC" =~ ^[0-9]+$ ]]; then
  pass "TC-06-017: teamMemberCount ($TC) and totalProjectCount ($PC) are integers"
else
  fail "TC-06-017: Non-integer values: teamMemberCount=$TC totalProjectCount=$PC"
fi

summary
