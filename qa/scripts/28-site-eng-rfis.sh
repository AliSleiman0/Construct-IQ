#!/usr/bin/env bash
# QA 28 — Site Engineer: RFI module (SE-8)
# A SITE_ENG raises RFIs (auto RFI-#### number, status OPEN), member-scoped to
# their projects; a PM (manage:rfis) answers them (status->ANSWERED, records who).
# The engineer CANNOT answer (no manage:rfis -> 403). PM keeps the org-wide view.
#
#   API=http://localhost:4001/api/v1 ./28-site-eng-rfis.sh   # against a non-default port
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 28 — Site Engineer: RFI module${NC}"

JAR=$(make_jar)     # PM (projects + members + answers)
JARE=$(make_jar)    # engineer (SITE_ENG, member-scoped)
MPID=""; NPID=""; RID=""; NRID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$RID" ]  && api_delete "$JAR" "$ORG_ID" "/rfis/$RID"  >/dev/null 2>&1 || true
    [ -n "$NRID" ] && api_delete "$JAR" "$ORG_ID" "/rfis/$NRID" >/dev/null 2>&1 || true
    [ -n "$MPID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$MPID" >/dev/null 2>&1 || true
    [ -n "$NPID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$NPID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARE"
}
trap cleanup EXIT

TS=$(date +%s)

# ── Logins ──────────────────────────────────────────────────────────────────
section "Logins"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-28-001: PM login" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-28-002: PM organizationId" "$ORG_ID"
echo "$RESP" | jq -e '.data.user.permissions | index("manage:rfis")' >/dev/null \
  && pass "TC-28-003: PM holds manage:rfis" \
  || fail "TC-28-003: manage:rfis missing for PM"

RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-28-004: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
echo "$RESP" | jq -e '.data.user.permissions | index("create:rfis")' >/dev/null \
  && pass "TC-28-005: engineer holds create:rfis" \
  || fail "TC-28-005: create:rfis missing for engineer"
echo "$RESP" | jq -e '.data.user.permissions | index("manage:rfis")' >/dev/null \
  && fail "TC-28-006: engineer must NOT hold manage:rfis" \
  || pass "TC-28-006: engineer does NOT hold manage:rfis"

# ── Projects: member + non-member ────────────────────────────────────────────
section "Projects (member + non-member)"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA28 Member $TS\",\"code\":\"QA28M\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
MPID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-28-010: member projectId" "$MPID"
api_post "$JAR" "$ORG_ID" "/projects/$MPID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}" >/dev/null

RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA28 Other $TS\",\"code\":\"QA28O\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
NPID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-28-011: non-member projectId" "$NPID"
# A non-member RFI (created by PM) the engineer must NOT see.
RESP=$(api_post "$JAR" "$ORG_ID" "/rfis" "{\"projectId\":\"$NPID\",\"subject\":\"Hidden RFI $TS\",\"question\":\"Should not be visible\"}")
NRID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-28-012: non-member RFI id" "$NRID"

# ── Engineer raises an RFI on their member project ───────────────────────────
section "Engineer raises an RFI"
RESP=$(api_post "$JARE" "$ORG_ID" "/rfis" "{\"projectId\":\"$MPID\",\"subject\":\"Beam clash $TS\",\"question\":\"Which beam takes priority at C3?\",\"discipline\":\"STRUCTURAL\"}")
RID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-28-020: RFI id" "$RID"
assert_field "TC-28-021: new RFI defaults to OPEN" "$RESP" ".data.status" "OPEN"
NUMBER=$(echo "$RESP" | jq -r '.data.number')
echo "$NUMBER" | grep -qE '^RFI-[0-9]{4}$' \
  && pass "TC-28-022: RFI number is RFI-#### ($NUMBER)" \
  || fail "TC-28-022: RFI number format wrong: $NUMBER"

# ── Member scoping ───────────────────────────────────────────────────────────
section "Member scoping"
RESP=$(api_get "$JARE" "$ORG_ID" "/rfis")
assert_contains "TC-28-030: engineer sees their member RFI" "$RESP" "$RID"
assert_not_contains "TC-28-031: engineer does NOT see the non-member RFI" "$RESP" "$NRID"

# ── Answering is manager-only ────────────────────────────────────────────────
section "Answer gating"
ST=$(http_status "$JARE" "$ORG_ID" "POST" "/rfis/$RID/answer" "{\"answer\":\"nope\"}")
assert_status "TC-28-040: engineer cannot answer an RFI (no manage:rfis)" "403" "$ST"

RESP=$(api_post "$JAR" "$ORG_ID" "/rfis/$RID/answer" "{\"answer\":\"Steel beam takes priority; see SK-12.\"}")
assert_field "TC-28-041: PM answer flips status to ANSWERED" "$RESP" ".data.status" "ANSWERED"
assert_field "TC-28-042: answer records answeredBy = PM" "$RESP" ".data.answeredById" "$(api_get "$JAR" "$ORG_ID" "/users/me" | jq -r '.data.id // .data._id')"
ANSWEREDAT=$(echo "$RESP" | jq -r '.data.answeredAt // empty')
assert_not_empty "TC-28-043: answer stamps answeredAt" "$ANSWEREDAT"
assert_contains "TC-28-044: answer body is stored" "$RESP" "Steel beam takes priority"

# ── PM keeps the org-wide view ───────────────────────────────────────────────
section "PM org-wide"
RESP=$(api_get "$JAR" "$ORG_ID" "/rfis")
assert_contains "TC-28-050: PM sees the member RFI" "$RESP" "$RID"
assert_contains "TC-28-051: PM sees the non-member RFI (org-wide)" "$RESP" "$NRID"

summary
