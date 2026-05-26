#!/usr/bin/env bash
# QA 22 — Site Engineer: dashboard (GET /dashboard/site-eng)
# Member-scoped "my work" dashboard: task metrics narrowed to assignedToId=me,
# reports to createdById=me, open issues across the engineer's projects.
#   API=http://localhost:4001/api/v1 ./22-site-eng-dashboard.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 22 — Site Engineer: dashboard${NC}"

JAR=$(make_jar)    # PM
JARE=$(make_jar)   # engineer
PID=""; TID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$TID" ] && api_delete "$JAR" "$ORG_ID" "/tasks/$TID" >/dev/null 2>&1 || true
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARE"
}
trap cleanup EXIT

# ── Logins ──────────────────────────────────────────────────────────────────
section "Logins + permission"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-22-001: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')

# read:dashboard granted to SITE_ENG → 200 (not 403)
CODE=$(http_status "$JARE" "$ORG_ID" GET "/dashboard/site-eng")
assert_status "TC-22-002: engineer authorized for /dashboard/site-eng" "200" "$CODE"

# ── Shape ─────────────────────────────────────────────────────────────────────
section "Response shape"
RESP=$(api_get "$JARE" "$ORG_ID" "/dashboard/site-eng")
echo "$RESP" | jq -e '.data | has("projectCount") and has("myOpenTaskCount") and has("myTasksDueThisWeek") and has("openIssueCount") and has("myReportsThisWeek") and has("taskThroughput") and has("myOpenTasksByStatus")' >/dev/null \
  && pass "TC-22-010: dashboard has the my-work metric keys" || fail "TC-22-010: missing keys: $(echo "$RESP" | jq -c '.data | keys')"
echo "$RESP" | jq -e '.data.taskThroughput | length == 7' >/dev/null \
  && pass "TC-22-011: taskThroughput is a 7-day series" || fail "TC-22-011: throughput not length 7"
echo "$RESP" | jq -e '[.data.myOpenTasksByStatus[].label] == ["To Do","Prep","In Progress","Blocked","Review"]' >/dev/null \
  && pass "TC-22-012: myOpenTasksByStatus has the fixed status order" || fail "TC-22-012: status labels off"

# ── Metric deltas: assign a task + file a report, expect counts to rise ───────
section "Metric deltas (assignee + own reports)"
BEFORE=$(echo "$RESP" | jq -r '.data.myOpenTaskCount')
RBEFORE=$(echo "$RESP" | jq -r '.data.myReportsThisWeek')

RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA22 Dash $(date +%s)\",\"code\":\"QA22\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-22-020: scratch projectId" "$PID"
api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}" >/dev/null
# PM assigns a task to the engineer
RESP=$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"projectId\":\"$PID\",\"title\":\"QA22 dash task\",\"status\":\"TODO\",\"assignedToId\":\"$ENG_ID\"}")
TID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-22-021: assigned taskId" "$TID"
# Engineer files a report (createdById = engineer)
api_post "$JARE" "$ORG_ID" "/reports" "{\"projectId\":\"$PID\",\"reportDate\":\"2026-05-22\",\"workCompleted\":\"QA22 dash report\"}" >/dev/null

RESP=$(api_get "$JARE" "$ORG_ID" "/dashboard/site-eng")
AFTER=$(echo "$RESP" | jq -r '.data.myOpenTaskCount')
RAFTER=$(echo "$RESP" | jq -r '.data.myReportsThisWeek')
[ "$AFTER" -gt "$BEFORE" ] && pass "TC-22-022: myOpenTaskCount rose after assignment ($BEFORE→$AFTER)" || fail "TC-22-022: open task count did not rise ($BEFORE→$AFTER)"
[ "$RAFTER" -gt "$RBEFORE" ] && pass "TC-22-023: myReportsThisWeek rose after filing ($RBEFORE→$RAFTER)" || fail "TC-22-023: report count did not rise ($RBEFORE→$RAFTER)"
echo "$RESP" | jq -e '[.data.myOpenTasksByStatus[] | select(.label=="To Do")][0].value >= 1' >/dev/null \
  && pass "TC-22-024: To Do bucket reflects the assigned task" || fail "TC-22-024: To Do bucket not incremented"

# ── A PM (manage:*) gets the PM dashboard, not this one being org-wide ────────
section "Role isolation"
CODE=$(http_status "$JAR" "$ORG_ID" GET "/dashboard/site-eng")
assert_status "TC-22-030: PM can also call it (has read:dashboard)" "200" "$CODE"

summary
