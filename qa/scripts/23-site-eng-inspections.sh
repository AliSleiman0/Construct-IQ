#!/usr/bin/env bash
# QA 23 — Site Engineer: Inspections (greenfield module, thin v1)
# CRUD + project-membership scoping. Status doubles as the outcome
# (SCHEDULED → PASSED/FAILED/CANCELLED). No checklist/photos/sign-off.
#   API=http://localhost:4001/api/v1 ./23-site-eng-inspections.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 23 — Site Engineer: inspections${NC}"

JAR=$(make_jar)    # PM (manage:inspections, org-wide)
JARE=$(make_jar)   # engineer (create/read/update, member-scoped)
PID=""; IID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$IID" ] && api_delete "$JAR" "$ORG_ID" "/inspections/$IID" >/dev/null 2>&1 || true
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARE"
}
trap cleanup EXIT

# ── Logins + scratch project (engineer is a member) ──────────────────────────
section "Setup"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-23-001: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA23 Insp $(date +%s)\",\"code\":\"QA23\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-23-002: scratch projectId" "$PID"
api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}" >/dev/null

# ── Engineer schedules an inspection ─────────────────────────────────────────
section "Create (schedule)"
RESP=$(api_post "$JARE" "$ORG_ID" "/inspections" "{\"projectId\":\"$PID\",\"title\":\"Rebar inspection\",\"type\":\"STRUCTURAL\",\"scheduledFor\":\"2026-05-26\",\"location\":\"Level 3 deck\"}")
assert_success "TC-23-010: POST /inspections → success" "$RESP"
IID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-23-011: inspectionId" "$IID"
assert_field "TC-23-012: defaults to SCHEDULED" "$RESP" ".data.status" "SCHEDULED"
assert_field "TC-23-013: type persisted" "$RESP" ".data.type" "STRUCTURAL"
echo "$RESP" | jq -e '.data.project | has("name")' >/dev/null \
  && pass "TC-23-014: project populated (name)" || fail "TC-23-014: project not populated"

# ── List is member-scoped + carries the new row ──────────────────────────────
section "List (member-scoped)"
RESP=$(api_get "$JARE" "$ORG_ID" "/inspections?projectId=$PID")
assert_contains "TC-23-020: engineer list contains the inspection" "$RESP" "$IID"
# A NON-member project filter yields nothing (no override of member scope).
RESP=$(api_get "$JARE" "$ORG_ID" "/inspections?projectId=does-not-exist")
echo "$RESP" | jq -e '.data | length == 0' >/dev/null \
  && pass "TC-23-021: non-member projectId → empty" || fail "TC-23-021: leaked"

# ── Record an outcome (status update) ────────────────────────────────────────
section "Outcome update"
RESP=$(api_patch "$JARE" "$ORG_ID" "/inspections/$IID" "{\"status\":\"PASSED\"}")
assert_field "TC-23-030: PATCH status → PASSED" "$RESP" ".data.status" "PASSED"

# ── Permission gating ────────────────────────────────────────────────────────
section "Permission gating"
# CLIENT lacks read:inspections → 403
JARC=$(make_jar)
login "$JARC" "client@constructiq.com" "Demo@1234" >/dev/null
CODE=$(http_status "$JARC" "$ORG_ID" GET "/inspections")
assert_status "TC-23-040: CLIENT (no read:inspections) → 403" "403" "$CODE"
cleanup_jar "$JARC"
# Engineer lacks manage:inspections → cannot delete
CODE=$(http_status "$JARE" "$ORG_ID" DELETE "/inspections/$IID")
assert_status "TC-23-041: engineer DELETE (needs manage) → 403" "403" "$CODE"
# PM (manage:inspections) sees it org-wide + can delete
RESP=$(api_get "$JAR" "$ORG_ID" "/inspections?projectId=$PID")
assert_contains "TC-23-042: PM sees the inspection org-wide" "$RESP" "$IID"

summary
