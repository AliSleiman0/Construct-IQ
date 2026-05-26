#!/usr/bin/env bash
# QA 21 — Site Engineer: project-membership scoping of issues/reports/tasks
# A field role (SITE_ENG) must only see data for the projects they are a member
# of, while a manager (PM, manage:*) keeps the org-wide view. Verifies the
# server-side member-scoping added in the Site Engineer Cycle 1.
#
#   API=http://localhost:4001/api/v1 ./21-site-eng-scoping.sh   # against a non-default port
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 21 — Site Engineer: membership scoping${NC}"

JAR=$(make_jar)     # PM (org-wide)
JARE=$(make_jar)    # engineer (SITE_ENG, member-scoped)
PID=""; IID=""; RID=""; TID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$IID" ] && api_delete "$JAR" "$ORG_ID" "/issues/$IID" >/dev/null 2>&1 || true
    [ -n "$TID" ] && api_delete "$JAR" "$ORG_ID" "/tasks/$TID" >/dev/null 2>&1 || true
    # reports have no delete endpoint — scratch report persists
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARE"
}
trap cleanup EXIT

# ── Logins ──────────────────────────────────────────────────────────────────
section "Logins"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-21-001: PM login" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-21-002: PM organizationId" "$ORG_ID"

RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-21-003: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // .data.user.sub // empty')
assert_not_empty "TC-21-004: engineer userId" "$ENG_ID"
# Engineer's role must be the canonical CODE (role-seed reconciliation)
echo "$RESP" | jq -e '.data.user.roles | index("SITE_ENG")' >/dev/null \
  && pass "TC-21-005: login returns canonical role code SITE_ENG" \
  || fail "TC-21-005: role code SITE_ENG missing from login roles: $(echo "$RESP" | jq -c '.data.user.roles')"

# ── Engineer sees their seeded Company-A projects ────────────────────────────
section "Engineer is a member of the seeded projects"
RESP=$(api_get "$JARE" "$ORG_ID" "/projects")
assert_array_not_empty "TC-21-010: engineer sees their member projects" "$RESP" ".data"

# ── Scratch project the engineer is NOT a member of ──────────────────────────
section "Scratch project (engineer NOT a member)"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA21 Scoping $(date +%s)\",\"code\":\"QA21\",\"status\":\"ACTIVE\",\"totalBudget\":100000,\"currency\":\"USD\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-21-011: scratch projectId" "$PID"

# Seed one issue, one report, one task on the scratch project (as PM).
RESP=$(api_post "$JAR" "$ORG_ID" "/issues" "{\"projectId\":\"$PID\",\"title\":\"QA21 hidden issue\",\"type\":\"QUALITY\",\"severity\":\"HIGH\"}")
IID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-21-012: scratch issueId" "$IID"
RESP=$(api_post "$JAR" "$ORG_ID" "/reports" "{\"projectId\":\"$PID\",\"reportDate\":\"2026-05-21\",\"workCompleted\":\"QA21 hidden report\"}")
RID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-21-013: scratch reportId" "$RID"
RESP=$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"projectId\":\"$PID\",\"title\":\"QA21 hidden task\",\"status\":\"TODO\"}")
TID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-21-014: scratch taskId" "$TID"

# ── PM (manage:*) sees the scratch data org-wide ─────────────────────────────
section "PM sees scratch data org-wide"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues?limit=200")
assert_contains "TC-21-020: PM issues list contains scratch issue" "$RESP" "$IID"
RESP=$(api_get "$JAR" "$ORG_ID" "/reports")
assert_contains "TC-21-021: PM reports list contains scratch report" "$RESP" "$RID"
RESP=$(api_get "$JAR" "$ORG_ID" "/tasks")
assert_contains "TC-21-022: PM tasks list contains scratch task" "$RESP" "$TID"

# ── Engineer must NOT see the scratch data (not a member) ────────────────────
section "Engineer does NOT see non-member project data"
RESP=$(api_get "$JARE" "$ORG_ID" "/issues?limit=200")
assert_not_contains "TC-21-030: engineer issues exclude scratch issue" "$RESP" "$IID"
RESP=$(api_get "$JARE" "$ORG_ID" "/reports")
assert_not_contains "TC-21-031: engineer reports exclude scratch report" "$RESP" "$RID"
RESP=$(api_get "$JARE" "$ORG_ID" "/tasks")
assert_not_contains "TC-21-032: engineer tasks exclude scratch task" "$RESP" "$TID"

# Explicit projectId filter on a non-member project yields nothing (no override).
RESP=$(api_get "$JARE" "$ORG_ID" "/issues?projectId=$PID")
echo "$RESP" | jq -e '.data.items | length == 0' >/dev/null \
  && pass "TC-21-033: engineer ?projectId=<non-member> returns empty" \
  || fail "TC-21-033: leaked non-member project via explicit projectId filter"

# ── Add engineer as a member → data becomes visible ──────────────────────────
section "After membership is granted, scratch data is visible"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}")
assert_success "TC-21-040: PM adds engineer to scratch project" "$RESP"
RESP=$(api_get "$JARE" "$ORG_ID" "/issues?limit=200")
assert_contains "TC-21-041: engineer now sees scratch issue" "$RESP" "$IID"
RESP=$(api_get "$JARE" "$ORG_ID" "/reports")
assert_contains "TC-21-042: engineer now sees scratch report" "$RESP" "$RID"
RESP=$(api_get "$JARE" "$ORG_ID" "/tasks")
assert_contains "TC-21-043: engineer now sees scratch task" "$RESP" "$TID"

# Summary endpoint is also member-scoped: before membership it excluded the
# scratch issue; now (member) the scratch issue counts toward open.
RESP=$(api_get "$JARE" "$ORG_ID" "/issues/summary?projectId=$PID")
echo "$RESP" | jq -e '.data.open >= 1' >/dev/null \
  && pass "TC-21-044: engineer summary counts member-project issue" \
  || fail "TC-21-044: summary did not reflect member-project issue: $(echo "$RESP" | jq -c '.data')"

summary
