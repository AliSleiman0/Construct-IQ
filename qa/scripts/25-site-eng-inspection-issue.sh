#!/usr/bin/env bash
# QA 25 — SE-3: failed inspection → linked Issue
# A QUALITY issue raised from an inspection stores inspectionId and exposes the
# populated inspection.title on read.
#   API=http://localhost:4001/api/v1 ./25-site-eng-inspection-issue.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 25 — Inspection → linked Issue${NC}"

JAR=$(make_jar)    # PM (setup)
JARE=$(make_jar)   # engineer
PID=""; INSPID=""; IID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$IID" ] && api_delete "$JAR" "$ORG_ID" "/issues/$IID" >/dev/null 2>&1 || true
    [ -n "$INSPID" ] && api_delete "$JAR" "$ORG_ID" "/inspections/$INSPID" >/dev/null 2>&1 || true
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARE"
}
trap cleanup EXIT

# ── Setup ─────────────────────────────────────────────────────────────────────
section "Setup"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-25-001: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA25 InspIssue $(date +%s)\",\"code\":\"QA25\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}" >/dev/null

# ── Engineer schedules + fails an inspection ──────────────────────────────────
section "Inspection → FAILED"
RESP=$(api_post "$JARE" "$ORG_ID" "/inspections" "{\"projectId\":\"$PID\",\"title\":\"Rebar inspection\",\"type\":\"STRUCTURAL\"}")
INSPID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-25-010: inspectionId" "$INSPID"
RESP=$(api_patch "$JARE" "$ORG_ID" "/inspections/$INSPID" "{\"status\":\"FAILED\"}")
assert_field "TC-25-011: inspection FAILED" "$RESP" ".data.status" "FAILED"

# ── Raise a QUALITY issue linked to the inspection ────────────────────────────
section "Raise linked issue"
RESP=$(api_post "$JARE" "$ORG_ID" "/issues" "{\"projectId\":\"$PID\",\"title\":\"Deficiency: Rebar inspection\",\"type\":\"QUALITY\",\"severity\":\"HIGH\",\"inspectionId\":\"$INSPID\"}")
assert_success "TC-25-020: POST /issues (linked) → success" "$RESP"
IID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-25-021: issueId" "$IID"

# ── Read back: link stored + inspection populated ─────────────────────────────
section "Link persisted + populated"
RESP=$(api_get "$JARE" "$ORG_ID" "/issues/$IID")
assert_field "TC-25-030: issue.inspectionId stored" "$RESP" ".data.inspectionId" "$INSPID"
assert_field "TC-25-031: issue.inspection.title populated" "$RESP" ".data.inspection.title" "Rebar inspection"
assert_field "TC-25-032: issue.type is QUALITY" "$RESP" ".data.type" "QUALITY"

# ── Reverse filter: issues raised from this inspection (SE-4) ─────────────────
section "Issues-by-inspection filter"
RESP=$(api_get "$JARE" "$ORG_ID" "/issues?inspectionId=$INSPID")
assert_contains "TC-25-040: ?inspectionId=<insp> contains the linked issue" "$RESP" "$IID"
RESP=$(api_get "$JARE" "$ORG_ID" "/issues?inspectionId=nonexistent-id")
echo "$RESP" | jq -e '.data.items | length == 0' >/dev/null \
  && pass "TC-25-041: ?inspectionId=<other> returns no issues" || fail "TC-25-041: unexpected matches"

summary
