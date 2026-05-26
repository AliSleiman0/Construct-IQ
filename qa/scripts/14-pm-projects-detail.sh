#!/usr/bin/env bash
# QA 14 — PM: Projects list + detail aggregation (+ admin regression)
# Verifies the exact shape the rewired ProjectsTable/ProjectDetail consume:
# list rows carry _count + status/budget/dates; detail hydrates members + _count;
# task counts are accurate; org admin sees the same shape (admin pages regression).
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 14 — PM: Projects list + detail${NC}"

JAR=$(make_jar)    # PM
JARA=$(make_jar)   # Org admin — admin pages regression
PID=""

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_ID:-}" ]; then
    api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARA"
}
trap cleanup EXIT

# ── Login + scratch project ───────────────────────────────────────────────────
section "PM Login + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-14-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-14-002: organizationId present" "$ORG_ID"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA14 Detail $(date +%s)\",\"code\":\"QA14\",\"status\":\"PLANNING\",\"totalBudget\":1000000,\"currency\":\"USD\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-14-003: scratch projectId present" "$PID"

# ── List shape (fields the table renders) ─────────────────────────────────────
section "List shape"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects")
assert_success "TC-14-010: GET /projects → success" "$RESP"
ROW=$(echo "$RESP" | jq -c ".data[] | select((.id // ._id) == \"$PID\")")
assert_not_empty "TC-14-011: scratch project present in list" "$ROW"
echo "$ROW" | jq -e 'has("_count") and (._count|has("members") and has("tasks") and has("issues"))' >/dev/null \
  && pass "TC-14-012: list row carries _count.{members,tasks,issues}" \
  || fail "TC-14-012: list row missing _count fields"
echo "$ROW" | jq -e 'has("status") and has("totalBudget") and has("currency") and has("code")' >/dev/null \
  && pass "TC-14-013: list row carries status/totalBudget/currency/code" \
  || fail "TC-14-013: list row missing status/budget/currency/code"

# ── Detail shape (members hydrated, _count, phases) ───────────────────────────
section "Detail shape"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID")
assert_success "TC-14-020: GET /projects/:id → success" "$RESP"
echo "$RESP" | jq -e '.data._count | has("members") and has("tasks") and has("issues")' >/dev/null \
  && pass "TC-14-021: detail carries _count" || fail "TC-14-021: detail missing _count"
echo "$RESP" | jq -e '.data | has("members") and (.members|type=="array")' >/dev/null \
  && pass "TC-14-022: detail carries members[]" || fail "TC-14-022: detail missing members[]"
# Creator (PM) should be a hydrated member with user.firstName/lastName/email.
echo "$RESP" | jq -e '.data.members[0].user | has("firstName") and has("lastName") and has("email")' >/dev/null \
  && pass "TC-14-023: member.user is hydrated (firstName/lastName/email)" \
  || fail "TC-14-023: member.user not hydrated"

# ── Count accuracy (detail _count.tasks === GET /tasks length) ────────────────
section "Count accuracy"
for i in 1 2 3; do
  api_post "$JAR" "$ORG_ID" "/tasks" "{\"title\":\"count task $i\",\"projectId\":\"$PID\",\"status\":\"TODO\"}" >/dev/null
done
DETAIL_COUNT=$(api_get "$JAR" "$ORG_ID" "/projects/$PID" | jq -r '.data._count.tasks')
LIST_LEN=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PID" | jq -r '.data | length')
[ "$DETAIL_COUNT" = "3" ] && pass "TC-14-030: detail _count.tasks == 3" \
  || fail "TC-14-030: detail _count.tasks expected 3, got $DETAIL_COUNT"
[ "$DETAIL_COUNT" = "$LIST_LEN" ] && pass "TC-14-031: _count.tasks matches /tasks length ($LIST_LEN)" \
  || fail "TC-14-031: _count.tasks ($DETAIL_COUNT) != /tasks length ($LIST_LEN)"

# ── Edit persists ─────────────────────────────────────────────────────────────
section "Edit project"
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID" '{"status":"ACTIVE","totalBudget":2500000}')
assert_field "TC-14-040: PATCH status → ACTIVE" "$RESP" ".data.status" "ACTIVE"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID")
assert_field "TC-14-041: status persisted" "$RESP" ".data.status" "ACTIVE"
# Inline edit from the PM projects list edits name + status via the same PATCH endpoint.
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID" '{"name":"QA14 Renamed","status":"ON_HOLD"}')
assert_field "TC-14-042: PATCH name → renamed" "$RESP" ".data.name" "QA14 Renamed"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID")
assert_field "TC-14-043: renamed name persisted" "$RESP" ".data.name" "QA14 Renamed"
assert_field "TC-14-044: status ON_HOLD persisted" "$RESP" ".data.status" "ON_HOLD"

# ── Admin regression (org admin sees same shape; /admin/projects/[id] works) ──
# findAll scopes non-super-admins to member projects, so add the org admin to the
# scratch project first, then verify the list + the detail endpoint (the bug fix).
section "Admin pages regression"
RESP=$(login "$JARA" "orgadmin@constructiq.com" "Demo@1234")
ORG_A=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
ADMIN_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
if [ -n "$ORG_A" ] && [ -n "$ADMIN_ID" ]; then
  RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ADMIN_ID\",\"role\":\"Admin\"}")
  assert_field "TC-14-050: PM adds org admin as member" "$RESP" ".success" "true"
  RESP=$(api_get "$JARA" "$ORG_A" "/projects")
  assert_contains "TC-14-051: org admin list now includes scratch project" "$RESP" "$PID"
  RESP=$(api_get "$JARA" "$ORG_A" "/projects/$PID")
  assert_success "TC-14-052: org admin GET /projects/:id → success (no 'not found' bug)" "$RESP"
  echo "$RESP" | jq -e '.data._count and (.data.members|type=="array")' >/dev/null \
    && pass "TC-14-053: admin detail has same _count/members shape" \
    || fail "TC-14-053: admin detail shape mismatch"

  # ── Member management (add/remove + last-member guard) ──────────────────────
  section "Member management"
  # Project now has 2 members (PM creator + org admin); the admin member is hydrated.
  RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID")
  echo "$RESP" | jq -e ".data.members[] | select(.id==\"$ADMIN_ID\") | .user.firstName" >/dev/null \
    && pass "TC-14-060: added member is hydrated (user.firstName)" \
    || fail "TC-14-060: added member not hydrated"
  # Update the admin member's project role (added with role "Admin" → "Foreman").
  RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/members/$ADMIN_ID" '{"role":"Foreman"}')
  assert_field "TC-14-063: PATCH member role → success" "$RESP" ".success" "true"
  ROLE=$(api_get "$JAR" "$ORG_ID" "/projects/$PID" | jq -r ".data.members[] | select(.id==\"$ADMIN_ID\") | .role")
  [ "$ROLE" = "Foreman" ] && pass "TC-14-064: member role persisted (Foreman)" \
    || fail "TC-14-064: role expected Foreman, got '$ROLE'"
  CODE=$(http_status "$JAR" "$ORG_ID" PATCH "/projects/$PID/members/ghost-user" '{"role":"x"}')
  assert_status "TC-14-065: PATCH role for non-member → 404" "404" "$CODE"
  # Remove the admin (2 → 1) succeeds.
  CODE=$(http_status "$JAR" "$ORG_ID" DELETE "/projects/$PID/members/$ADMIN_ID")
  assert_status "TC-14-061: remove member (2→1) → 200" "200" "$CODE"
  # The sole remaining member (PM creator) cannot be removed.
  PM_ID=$(api_get "$JAR" "$ORG_ID" "/projects/$PID" | jq -r '.data.members[0].id')
  CODE=$(http_status "$JAR" "$ORG_ID" DELETE "/projects/$PID/members/$PM_ID")
  assert_status "TC-14-062: removing the last member → 400" "400" "$CODE"
else
  skip "TC-14-050..065: org admin login unavailable"
fi

# ── Delete project (PM list delete action uses this) ──────────────────────────
section "Delete project"
CODE=$(http_status "$JAR" "$ORG_ID" DELETE "/projects/$PID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } \
  && pass "TC-14-070: DELETE /projects/:id → $CODE" \
  || fail "TC-14-070: delete expected 200/204, got $CODE"
CODE=$(http_status "$JAR" "$ORG_ID" GET "/projects/$PID")
assert_status "TC-14-071: GET deleted project → 404" "404" "$CODE"
PID=""  # already deleted; skip trap teardown

summary
