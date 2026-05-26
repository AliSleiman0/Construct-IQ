#!/usr/bin/env bash
# QA 17 — PM: Dashboard (real API, /dashboard/pm)
# Verifies the PM is authorized (read:dashboard), the response shape the widgets
# consume, and that the member-scoped counts react to a new project + task.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 17 — PM: Dashboard${NC}"

JAR=$(make_jar)
PID=""
TID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$TID" ] && api_delete "$JAR" "$ORG_ID" "/tasks/$TID" >/dev/null 2>&1 || true
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"
}
trap cleanup EXIT

# ── Login ─────────────────────────────────────────────────────────────────────
section "PM Login"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-17-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-17-002: organizationId present" "$ORG_ID"

# ── Authorized + shape ────────────────────────────────────────────────────────
section "Authorized + response shape"
CODE=$(http_status "$JAR" "$ORG_ID" GET "/dashboard/pm")
assert_status "TC-17-010: PM can GET /dashboard/pm (read:dashboard)" "200" "$CODE"
RESP=$(api_get "$JAR" "$ORG_ID" "/dashboard/pm")
assert_success "TC-17-011: GET /dashboard/pm → success" "$RESP"
echo "$RESP" | jq -e '.data | has("projectCount") and has("openTaskCount") and has("tasksDueThisWeek") and has("openIssueCount") and has("escalatedIssueCount") and has("reportsThisWeek")' >/dev/null \
  && pass "TC-17-012: carries all stat-card fields" || fail "TC-17-012: missing stat-card fields"
echo "$RESP" | jq -e '.data.taskThroughput | length==7' >/dev/null \
  && pass "TC-17-013: taskThroughput has 7 daily buckets" || fail "TC-17-013: throughput length wrong"
echo "$RESP" | jq -e '.data.openTasksByStatus | length==5' >/dev/null \
  && pass "TC-17-014: openTasksByStatus has 5 status buckets" || fail "TC-17-014: status buckets wrong"
echo "$RESP" | jq -e '.data.escalatedIssueCount <= .data.openIssueCount' >/dev/null \
  && pass "TC-17-015: escalated ≤ open issues" || fail "TC-17-015: escalated > open"

BASE_PROJECTS=$(echo "$RESP" | jq -r '.data.projectCount')
BASE_TASKS=$(echo "$RESP" | jq -r '.data.openTaskCount')

# ── Counts react to a new member-scoped project + task ────────────────────────
section "Member-scoped counts"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA17 Dash $(date +%s)\",\"code\":\"QA17\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-17-020: scratch projectId present" "$PID"
RESP=$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"projectId\":\"$PID\",\"title\":\"dash task\",\"status\":\"TODO\"}")
TID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-17-021: scratch taskId present" "$TID"

RESP=$(api_get "$JAR" "$ORG_ID" "/dashboard/pm")
NOW_PROJECTS=$(echo "$RESP" | jq -r '.data.projectCount')
NOW_TASKS=$(echo "$RESP" | jq -r '.data.openTaskCount')
[ "$NOW_PROJECTS" = "$((BASE_PROJECTS + 1))" ] \
  && pass "TC-17-022: projectCount +1 ($BASE_PROJECTS→$NOW_PROJECTS)" \
  || fail "TC-17-022: projectCount expected $((BASE_PROJECTS + 1)), got $NOW_PROJECTS"
[ "$NOW_TASKS" = "$((BASE_TASKS + 1))" ] \
  && pass "TC-17-023: openTaskCount +1 ($BASE_TASKS→$NOW_TASKS)" \
  || fail "TC-17-023: openTaskCount expected $((BASE_TASKS + 1)), got $NOW_TASKS"

echo -e "\n${CYAN}QA 17 done — ${GREEN}${PASS} pass${NC} / ${RED}${FAIL} fail${NC}"
[ "$FAIL" -eq 0 ]
