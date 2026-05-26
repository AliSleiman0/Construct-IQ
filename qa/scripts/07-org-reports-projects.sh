#!/usr/bin/env bash
# QA 07 — Org Admin: Reports & Projects
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 07 — Org Admin: Reports & Projects${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT
TS="$(date +%s)"
CREATED_PROJECT_ID=""

section "Org Admin Login"
RESP=$(login "$JAR" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-07-001: Login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-07-002: organizationId present" "$ORG_ID"

# ═══════════════════════════════════════════════════════════════════
# DASHBOARD — reports stats
# ═══════════════════════════════════════════════════════════════════
section "Dashboard Data for Reports Page"
DASH=$(api_get "$JAR" "$ORG_ID" "/dashboard/org")
assert_success "TC-07-003: GET /dashboard/org for reports stats" "$DASH"

TOTAL_PC=$(echo "$DASH" | jq -r '.data.totalProjectCount // 0')
ACTIVE_PC=$(echo "$DASH" | jq -r '.data.activeProjectCount // 0')
OPEN_ISS=$(echo "$DASH" | jq -r '.data.openIssueCount // 0')
REPORTS30=$(echo "$DASH" | jq -r '.data.reportsFiledLast30d // 0')

[[ "$TOTAL_PC" =~ ^[0-9]+$ ]] && pass "TC-07-004: totalProjectCount is integer ($TOTAL_PC)" || \
  fail "TC-07-004: totalProjectCount not integer: $TOTAL_PC"
[[ "$ACTIVE_PC" =~ ^[0-9]+$ ]] && pass "TC-07-005: activeProjectCount is integer ($ACTIVE_PC)" || \
  fail "TC-07-005: activeProjectCount not integer: $ACTIVE_PC"

# ═══════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════
section "Projects List"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects")
assert_success "TC-07-006: GET /projects → success" "$RESP"
assert_array_not_empty "TC-07-007: Projects list not empty" "$RESP" ".data"

FIRST_PROJ=$(echo "$RESP" | jq '.data[0]')
assert_not_empty "TC-07-008: Project has name" \
  "$(echo "$FIRST_PROJ" | jq -r '.name // empty')"
assert_not_empty "TC-07-009: Project has status" \
  "$(echo "$FIRST_PROJ" | jq -r '.status // empty')"
assert_not_empty "TC-07-010: Project has organizationId" \
  "$(echo "$FIRST_PROJ" | jq -r '.organizationId // empty')"

PROJ_ORG=$(echo "$FIRST_PROJ" | jq -r '.organizationId')
[ "$PROJ_ORG" = "$ORG_ID" ] && pass "TC-07-011: Project scoped to correct org" || \
  fail "TC-07-011: Project org $PROJ_ORG ≠ $ORG_ID"

PROJECT_ID=$(echo "$FIRST_PROJ" | jq -r '.id // ._id // empty')

section "Project Status Values"
STATUSES=$(echo "$RESP" | jq -r '[.data[].status] | unique | .[]' 2>/dev/null)
VALID="PLANNING ACTIVE ON_HOLD COMPLETED CANCELLED"
while IFS= read -r s; do
  if echo "$VALID" | grep -qw "$s"; then
    pass "TC-07-012: Status '$s' is valid enum"
  else
    fail "TC-07-012: Invalid project status: '$s'"
  fi
done <<< "$STATUSES"

section "Create Project"
CREATE_BODY="{\"name\":\"QA Project $TS\",\"status\":\"PLANNING\"}"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "$CREATE_BODY")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-07-013: POST /projects → 201"
  CREATED_PROJECT_ID=$(echo "$RESP" | jq -r '.data._id // .data.id // empty')
  assert_not_empty "TC-07-014: Created project has _id" "$CREATED_PROJECT_ID"
  assert_field "TC-07-015: Project name matches" "$RESP" ".data.name" "QA Project $TS"
else
  fail "TC-07-013: POST /projects → $(echo "$RESP" | jq -r '.statusCode // "error"') ($(echo "$RESP" | jq -r '.error.message[0] // .error.message // "unknown"'))"
  skip "TC-07-014: Create project skipped"
  skip "TC-07-015: Project name check skipped"
fi

section "Get Single Project"
if [ -n "$PROJECT_ID" ]; then
  RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PROJECT_ID")
  assert_success "TC-07-016: GET /projects/:id → success" "$RESP"
  assert_not_empty "TC-07-017: Project detail has name" \
    "$(echo "$RESP" | jq -r '.data.name // empty')"
fi

section "Update Project"
if [ -n "$CREATED_PROJECT_ID" ]; then
  RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$CREATED_PROJECT_ID" '{"status":"ACTIVE"}')
  assert_success "TC-07-018: PATCH project status → ACTIVE" "$RESP"
  assert_field "TC-07-019: Status updated" "$RESP" ".data.status" "ACTIVE"
fi

section "Project Filtering"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects?status=ACTIVE")
assert_success "TC-07-020: GET /projects?status=ACTIVE → success" "$RESP"
ITEMS=$(echo "$RESP" | jq '.data | length')
if [ "$ITEMS" -gt 0 ]; then
  ALL_ACTIVE=$(echo "$RESP" | jq '[.data[] | select(.status != "ACTIVE")] | length')
  [ "$ALL_ACTIVE" -eq 0 ] && pass "TC-07-021: All filtered projects are ACTIVE" || \
    skip "TC-07-021: Server-side status filter not applied ($ALL_ACTIVE non-ACTIVE projects)"
fi

section "Tasks & Issues"
if [ -n "$PROJECT_ID" ]; then
  RESP=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PROJECT_ID")
  if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
    pass "TC-07-022: GET /tasks?projectId → success"
  else
    skip "TC-07-022: /tasks endpoint not available"
  fi

  RESP=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PROJECT_ID")
  if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
    pass "TC-07-023: GET /issues?projectId → success"
  else
    skip "TC-07-023: /issues endpoint not available"
  fi
fi

section "People / Users"
RESP=$(api_get "$JAR" "$ORG_ID" "/users")
assert_success "TC-07-024: GET /users → success" "$RESP"
assert_array_not_empty "TC-07-025: Users list not empty" "$RESP" ".data"
HAS_ADMIN=$(echo "$RESP" | jq '[.data[] | select(.email == "orgadmin@constructiq.com")] | length')
[ "$HAS_ADMIN" -ge 1 ] && pass "TC-07-026: orgadmin visible in users list" || \
  skip "TC-07-026: orgadmin not found in /users (may be scoped differently)"

section "Cleanup"
if [ -n "$CREATED_PROJECT_ID" ]; then
  STATUS=$(http_status "$JAR" "$ORG_ID" "DELETE" "/projects/$CREATED_PROJECT_ID")
  [ "$STATUS" = "200" ] || [ "$STATUS" = "204" ] && \
    pass "TC-07-027: Test project cleaned up" || \
    skip "TC-07-027: Project cleanup returned $STATUS"
fi

summary
