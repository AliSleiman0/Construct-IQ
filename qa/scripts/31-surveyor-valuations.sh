#!/usr/bin/env bash
# QA 31 — Surveyor: Valuations (B2 cycle 3 — backend exists, FE just wired)
# Verifies the valuation lifecycle (create→DRAFT, unique period→409, submit via PATCH→SUBMITTED,
# certify→CERTIFIED+stamp, certify-before-submit 400, re-certify 400) and permission gating.
# Member-scoping for the surveyor cost endpoints is already covered by 29-surveyor-boq.sh.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 31 — Surveyor: Valuations${NC}"

JARA=$(make_jar)   # ORG_ADMIN — creates the scratch project
JARQ=$(make_jar)   # QS / SURVEYOR (manage:budget) — raises + certifies
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
assert_field "TC-31-001: ORG_ADMIN login success" "$RESP" ".success" "true"
ORG_A=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-31-002: organizationId present" "$ORG_A"

RESP=$(login "$JARQ" "qs@constructiq.com" "Demo@1234")
assert_field "TC-31-003: QS (SURVEYOR) login success" "$RESP" ".success" "true"
ORG_Q=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')

login "$JAR" "pm@constructiq.com" "Demo@1234" > /dev/null
ORG_P=$(api_get "$JAR" "" "/auth/me" | jq -r '.data.organizationId // empty')
login "$JARC" "client@constructiq.com" "Demo@1234" > /dev/null

RESP=$(api_post "$JARA" "$ORG_A" "/projects" "{\"name\":\"QA31 Valuations $(date +%s)\",\"code\":\"QA31\",\"status\":\"ACTIVE\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-31-004: scratch projectId present" "$PID"

# ── Create → DRAFT ───────────────────────────────────────────────────────────
section "Create + lifecycle"
RESP=$(api_post "$JARQ" "$ORG_Q" "/valuations" "{\"projectId\":\"$PID\",\"period\":\"April 2026\",\"amountUsd\":138000,\"retentionUsd\":6900}")
assert_field "TC-31-010: QS create valuation → success" "$RESP" ".success" "true"
VID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-31-011: valuation id present" "$VID"
assert_field "TC-31-012: new valuation defaults to DRAFT" "$RESP" ".data.status" "DRAFT"
assert_field "TC-31-013: retentionUsd persists (6900)" "$RESP" ".data.retentionUsd" "6900"

# Unique period per project → 409.
CODE=$(http_status "$JARQ" "$ORG_Q" POST "/valuations" "{\"projectId\":\"$PID\",\"period\":\"April 2026\",\"amountUsd\":1}")
assert_status "TC-31-014: duplicate period (same project) → 409" "409" "$CODE"

# ── Certify before submit → 400 ──────────────────────────────────────────────
section "Certify guards"
CODE=$(http_status "$JARQ" "$ORG_Q" POST "/valuations/$VID/certify" "")
assert_status "TC-31-020: certify a DRAFT valuation → 400 (must submit first)" "400" "$CODE"

# ── Submit (PATCH status) → SUBMITTED ────────────────────────────────────────
section "Submit"
RESP=$(api_patch "$JARQ" "$ORG_Q" "/valuations/$VID" '{"status":"SUBMITTED"}')
assert_field "TC-31-030: PATCH status → SUBMITTED" "$RESP" ".data.status" "SUBMITTED"

# ── Certify → CERTIFIED + stamp ──────────────────────────────────────────────
section "Certify"
RESP=$(api_post "$JARQ" "$ORG_Q" "/valuations/$VID/certify" "")
assert_field "TC-31-040: certify → CERTIFIED" "$RESP" ".data.status" "CERTIFIED"
CERTIFIER=$(echo "$RESP" | jq -r '.data.certifiedById // empty')
assert_not_empty "TC-31-041: certifiedById stamped" "$CERTIFIER"
# Re-certifying an already-CERTIFIED valuation → 400.
CODE=$(http_status "$JARQ" "$ORG_Q" POST "/valuations/$VID/certify" "")
assert_status "TC-31-042: re-certify (already CERTIFIED) → 400" "400" "$CODE"

# ── Permission gating ────────────────────────────────────────────────────────
section "Permission gating"
CODE=$(http_status "$JAR" "$ORG_P" POST "/valuations" "{\"projectId\":\"$PID\",\"period\":\"PM period\",\"amountUsd\":1}")
assert_status "TC-31-050: PM create valuation → 403" "403" "$CODE"
CODE=$(http_status "$JAR" "$ORG_P" POST "/valuations/$VID/certify" "")
assert_status "TC-31-051: PM certify valuation → 403" "403" "$CODE"
CODE=$(http_status "$JARC" "$ORG_A" POST "/valuations" "{\"projectId\":\"$PID\",\"period\":\"C period\",\"amountUsd\":1}")
assert_status "TC-31-052: CLIENT create valuation → 403" "403" "$CODE"

# ── List reflects the certified valuation ────────────────────────────────────
section "List"
RESP=$(api_get "$JARQ" "$ORG_Q" "/valuations?projectId=$PID")
LEN=$(echo "$RESP" | jq -r '.data | length')
[ "$LEN" = "1" ] && pass "TC-31-060: one valuation listed for the project" || fail "TC-31-060: expected 1, got '$LEN'"

summary
