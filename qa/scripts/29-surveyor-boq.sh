#!/usr/bin/env bash
# QA 29 — Surveyor: BOQ (B2 cycle 1 — backend exists, FE just wired)
# Verifies BOQ business rules (totalAmount math, unique code, locked-item edit 400)
# AND the SE-1-class member-scoping fix: a read:budget-not-manage caller (PM) only
# sees BOQ rows for projects they belong to; SURVEYOR (manage:budget) stays org-wide.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 29 — Surveyor: BOQ${NC}"

JARA=$(make_jar)   # ORG_ADMIN — creates the scratch project (so PM is NOT auto-member) + adds members
JARQ=$(make_jar)   # QS / SURVEYOR (manage:budget) — owns BOQ, org-wide
JAR=$(make_jar)    # PM (read:budget, NOT manage) — member-scoped reader
JARC=$(make_jar)   # CLIENT — no budget perms
PID=""
CODE_TAG="B$(date +%s)"

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_A:-}" ]; then
    api_delete "$JARA" "$ORG_A" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JARA"; cleanup_jar "$JARQ"; cleanup_jar "$JAR"; cleanup_jar "$JARC"
}
trap cleanup EXIT

# ── Logins ────────────────────────────────────────────────────────────────────
section "Logins"
RESP=$(login "$JARA" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-29-001: ORG_ADMIN login success" "$RESP" ".success" "true"
ORG_A=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-29-002: organizationId present" "$ORG_A"

RESP=$(login "$JARQ" "qs@constructiq.com" "Demo@1234")
assert_field "TC-29-003: QS (SURVEYOR) login success" "$RESP" ".success" "true"
ORG_Q=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')

RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-29-004: PM login success" "$RESP" ".success" "true"
ORG_P=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
PM_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
assert_not_empty "TC-29-005: PM userId present" "$PM_ID"

login "$JARC" "client@constructiq.com" "Demo@1234" > /dev/null

# Scratch project created BY ORG_ADMIN → PM is not a member of it.
RESP=$(api_post "$JARA" "$ORG_A" "/projects" "{\"name\":\"QA29 BOQ $(date +%s)\",\"code\":\"QA29\",\"status\":\"ACTIVE\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-29-006: scratch projectId present" "$PID"

# ── BOQ business rules (QS, manage:budget) ───────────────────────────────────
section "BOQ create + math + unique code"
RESP=$(api_post "$JARQ" "$ORG_Q" "/boq" "{\"projectId\":\"$PID\",\"code\":\"$CODE_TAG.01\",\"description\":\"Concrete grade 30\",\"unit\":\"m³\",\"quantity\":10,\"unitRate\":250}")
assert_field "TC-29-010: QS create BOQ → success" "$RESP" ".success" "true"
BID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-29-011: BOQ id present" "$BID"
assert_field "TC-29-012: totalAmount = qty × rate (2500)" "$RESP" ".data.totalAmount" "2500"

# Duplicate code within the same project → 409.
CODE=$(http_status "$JARQ" "$ORG_Q" POST "/boq" "{\"projectId\":\"$PID\",\"code\":\"$CODE_TAG.01\",\"description\":\"dup\",\"unit\":\"m³\",\"quantity\":1,\"unitRate\":1}")
assert_status "TC-29-013: duplicate code → 409" "409" "$CODE"

# Edit recomputes totalAmount.
RESP=$(api_patch "$JARQ" "$ORG_Q" "/boq/$BID" '{"quantity":20,"unitRate":300}')
assert_field "TC-29-014: edit recomputes totalAmount (6000)" "$RESP" ".data.totalAmount" "6000"

# ── Locking (one-way: locked items reject further edits) ─────────────────────
section "Lock protection"
RESP=$(api_patch "$JARQ" "$ORG_Q" "/boq/$BID" '{"isLocked":true}')
assert_field "TC-29-020: lock the item → isLocked true" "$RESP" ".data.isLocked" "true"
CODE=$(http_status "$JARQ" "$ORG_Q" PATCH "/boq/$BID" '{"quantity":99}')
assert_status "TC-29-021: edit a locked item → 400" "400" "$CODE"

# ── Member-scoping (the SE-1-class leak fix) ─────────────────────────────────
section "Member-scoping"
# QS holds manage:budget → org-wide → sees the BOQ on a project they're not a member of.
RESP=$(api_get "$JARQ" "$ORG_Q" "/boq?projectId=$PID")
assert_contains "TC-29-030: QS (manage) sees BOQ org-wide" "$RESP" "$CODE_TAG.01"

# PM holds read:budget but NOT manage → member-scoped. PM is NOT a member of PID → empty.
RESP=$(api_get "$JAR" "$ORG_P" "/boq?projectId=$PID")
LEN=$(echo "$RESP" | jq -r '.data | length')
[ "$LEN" = "0" ] && pass "TC-29-031: PM (non-member) explicit projectId → empty" || fail "TC-29-031: expected 0, got '$LEN'"

# PM unscoped list must not leak this project's BOQ either.
RESP=$(api_get "$JAR" "$ORG_P" "/boq")
assert_not_contains "TC-29-032: PM unscoped list excludes non-member BOQ" "$RESP" "$CODE_TAG.01"

# Add PM as a member → PM now sees the BOQ for that project.
RESP=$(api_post "$JARA" "$ORG_A" "/projects/$PID/members" "{\"userId\":\"$PM_ID\",\"role\":\"Viewer\"}")
assert_success "TC-29-033: add PM as project member" "$RESP"
RESP=$(api_get "$JAR" "$ORG_P" "/boq?projectId=$PID")
assert_contains "TC-29-034: PM (now member) sees the BOQ" "$RESP" "$CODE_TAG.01"

# ── Permission gating ────────────────────────────────────────────────────────
section "Permission gating"
# PM lacks manage:budget → cannot create BOQ.
CODE=$(http_status "$JAR" "$ORG_P" POST "/boq" "{\"projectId\":\"$PID\",\"code\":\"$CODE_TAG.PM\",\"description\":\"x\",\"unit\":\"each\",\"quantity\":1,\"unitRate\":1}")
assert_status "TC-29-040: PM create BOQ → 403" "403" "$CODE"
# CLIENT lacks budget perms entirely → cannot create BOQ.
CODE=$(http_status "$JARC" "$ORG_A" POST "/boq" "{\"projectId\":\"$PID\",\"code\":\"$CODE_TAG.C\",\"description\":\"x\",\"unit\":\"each\",\"quantity\":1,\"unitRate\":1}")
assert_status "TC-29-041: CLIENT create BOQ → 403" "403" "$CODE"

# ── Delete ───────────────────────────────────────────────────────────────────
section "Delete"
CODE=$(http_status "$JARQ" "$ORG_Q" DELETE "/boq/$BID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } && pass "TC-29-050: QS delete BOQ → $CODE" || fail "TC-29-050: delete got $CODE"
RESP=$(api_get "$JARQ" "$ORG_Q" "/boq?projectId=$PID")
assert_not_contains "TC-29-051: deleted BOQ no longer listed" "$RESP" "$CODE_TAG.01"

summary
