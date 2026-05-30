#!/usr/bin/env bash
# QA 30 — Surveyor: Variations (B2 cycle 2 — backend exists, FE just wired)
# Verifies the variation lifecycle (create→PENDING, approve→APPROVED+stamp, re-approve 400,
# reject via PATCH→REJECTED, signed impactAmount) and permission gating. Member-scoping for
# the surveyor cost endpoints is already covered by 29-surveyor-boq.sh.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 30 — Surveyor: Variations${NC}"

JARA=$(make_jar)   # ORG_ADMIN — creates the scratch project
JARQ=$(make_jar)   # QS / SURVEYOR (manage:budget) — raises + approves
JAR=$(make_jar)    # PM (read:budget, NOT manage) — read-only
JARC=$(make_jar)   # CLIENT — no budget perms
PID=""

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_A:-}" ]; then
    api_delete "$JARA" "$ORG_A" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JARA"; cleanup_jar "$JARQ"; cleanup_jar "$JAR"; cleanup_jar "$JARC"
}
trap cleanup EXIT

# ── Logins + scratch project ──────────────────────────────────────────────────
section "Logins + scratch project"
RESP=$(login "$JARA" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-30-001: ORG_ADMIN login success" "$RESP" ".success" "true"
ORG_A=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-30-002: organizationId present" "$ORG_A"

RESP=$(login "$JARQ" "qs@constructiq.com" "Demo@1234")
assert_field "TC-30-003: QS (SURVEYOR) login success" "$RESP" ".success" "true"
ORG_Q=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')

login "$JAR" "pm@constructiq.com" "Demo@1234" > /dev/null
ORG_P=$(api_get "$JAR" "" "/auth/me" | jq -r '.data.organizationId // empty')
login "$JARC" "client@constructiq.com" "Demo@1234" > /dev/null

RESP=$(api_post "$JARA" "$ORG_A" "/projects" "{\"name\":\"QA30 Variations $(date +%s)\",\"code\":\"QA30\",\"status\":\"ACTIVE\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-30-004: scratch projectId present" "$PID"

# ── Create → PENDING (signed impact) ─────────────────────────────────────────
section "Create + lifecycle"
RESP=$(api_post "$JARQ" "$ORG_Q" "/variations" "{\"projectId\":\"$PID\",\"title\":\"Extra foundations\",\"impactAmount\":15000}")
assert_field "TC-30-010: QS create variation → success" "$RESP" ".success" "true"
VID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-30-011: variation id present" "$VID"
assert_field "TC-30-012: new variation defaults to PENDING" "$RESP" ".data.status" "PENDING"

# Signed negative impact round-trips.
RESP=$(api_post "$JARQ" "$ORG_Q" "/variations" "{\"projectId\":\"$PID\",\"title\":\"Scope reduction\",\"impactAmount\":-5000}")
VID2=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_field "TC-30-013: negative impactAmount persists (-5000)" "$RESP" ".data.impactAmount" "-5000"

# ── Approve (QS holds manage:budget) ─────────────────────────────────────────
section "Approve"
RESP=$(api_post "$JARQ" "$ORG_Q" "/variations/$VID/approve" "")
assert_field "TC-30-020: approve → APPROVED" "$RESP" ".data.status" "APPROVED"
APPROVER=$(echo "$RESP" | jq -r '.data.approvedById // empty')
assert_not_empty "TC-30-021: approvedById stamped" "$APPROVER"
# Re-approving a non-PENDING variation → 400.
CODE=$(http_status "$JARQ" "$ORG_Q" POST "/variations/$VID/approve" "")
assert_status "TC-30-022: re-approve (already APPROVED) → 400" "400" "$CODE"

# ── Reject via PATCH status ──────────────────────────────────────────────────
section "Reject"
RESP=$(api_patch "$JARQ" "$ORG_Q" "/variations/$VID2" '{"status":"REJECTED"}')
assert_field "TC-30-030: PATCH status → REJECTED" "$RESP" ".data.status" "REJECTED"

# ── Permission gating ────────────────────────────────────────────────────────
section "Permission gating"
CODE=$(http_status "$JAR" "$ORG_P" POST "/variations" "{\"projectId\":\"$PID\",\"title\":\"PM\",\"impactAmount\":1}")
assert_status "TC-30-040: PM create variation → 403" "403" "$CODE"
CODE=$(http_status "$JAR" "$ORG_P" POST "/variations/$VID/approve" "")
assert_status "TC-30-041: PM approve variation → 403" "403" "$CODE"
CODE=$(http_status "$JARC" "$ORG_A" POST "/variations" "{\"projectId\":\"$PID\",\"title\":\"C\",\"impactAmount\":1}")
assert_status "TC-30-042: CLIENT create variation → 403" "403" "$CODE"

# ── Delete ───────────────────────────────────────────────────────────────────
section "Delete"
CODE=$(http_status "$JARQ" "$ORG_Q" DELETE "/variations/$VID2")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } && pass "TC-30-050: QS delete variation → $CODE" || fail "TC-30-050: delete got $CODE"
RESP=$(api_get "$JARQ" "$ORG_Q" "/variations?projectId=$PID")
LEN=$(echo "$RESP" | jq -r '.data | length')
[ "$LEN" = "1" ] && pass "TC-30-051: one variation remains after delete" || fail "TC-30-051: expected 1, got '$LEN'"

summary
