#!/usr/bin/env bash
# QA 15 — PM: Issues triage (real API, post-migration of /pm/issues)
# Verifies the shape IssueBoardList/IssueDetailView consume: org-wide list,
# populated createdBy/project/assignee NAMES, comment authors, resolve/reopen.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 15 — PM: Issues triage${NC}"

JAR=$(make_jar)
JARC=$(make_jar)   # CLIENT — bulk permission check
PID=""
IID=""
CRIT=""
LOW=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    for x in "$IID" "$CRIT" "$LOW"; do
      [ -n "$x" ] && api_delete "$JAR" "$ORG_ID" "/issues/$x" >/dev/null 2>&1 || true
    done
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARC"
}
trap cleanup EXIT

# ── Login + scratch project ───────────────────────────────────────────────────
section "PM Login + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-15-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-15-002: organizationId present" "$ORG_ID"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA15 Issues $(date +%s)\",\"code\":\"QA15\",\"status\":\"ACTIVE\",\"totalBudget\":500000,\"currency\":\"USD\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-15-003: scratch projectId present" "$PID"

# ── Create issue ──────────────────────────────────────────────────────────────
section "Create issue"
RESP=$(api_post "$JAR" "$ORG_ID" "/issues" "{\"projectId\":\"$PID\",\"title\":\"Beam crack B-12\",\"description\":\"Hairline fracture\",\"type\":\"QUALITY\",\"severity\":\"HIGH\",\"location\":\"Floor 9\",\"trade\":\"Structural\"}")
assert_success "TC-15-010: POST /issues → success" "$RESP"
IID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-15-011: issueId present" "$IID"
assert_field "TC-15-012: status defaults OPEN" "$RESP" ".data.status" "OPEN"

# ── Org-wide list (paginated triage list) carries populated names ─────────────
section "Org-wide list shape (paginated)"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues")
assert_success "TC-15-020: GET /issues (org-wide) → success" "$RESP"
echo "$RESP" | jq -e '.data | has("items") and has("total") and has("limit") and has("skip")' >/dev/null \
  && pass "TC-15-024: list returns {items,total,limit,skip}" || fail "TC-15-024: not the paginated shape"
ROW=$(echo "$RESP" | jq -c ".data.items[] | select((.id // ._id) == \"$IID\")")
assert_not_empty "TC-15-021: created issue present in org-wide list" "$ROW"
echo "$ROW" | jq -e '.createdBy | has("firstName") and has("lastName")' >/dev/null \
  && pass "TC-15-022: list row carries createdBy name" || fail "TC-15-022: createdBy not populated"
echo "$ROW" | jq -e '.project | has("name")' >/dev/null \
  && pass "TC-15-023: list row carries project.name" || fail "TC-15-023: project not populated"

# ── projectId filter ──────────────────────────────────────────────────────────
section "projectId filter"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PID")
echo "$RESP" | jq -e ".data.items[] | select((.id // ._id) == \"$IID\")" >/dev/null \
  && pass "TC-15-030: issue present when filtered by projectId" || fail "TC-15-030: missing under projectId filter"

# ── Detail shape ──────────────────────────────────────────────────────────────
section "Detail shape"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues/$IID")
assert_success "TC-15-040: GET /issues/:id → success" "$RESP"
echo "$RESP" | jq -e '.data.createdBy | has("firstName")' >/dev/null \
  && pass "TC-15-041: detail createdBy populated" || fail "TC-15-041: detail createdBy missing"
echo "$RESP" | jq -e '.data | has("location") and .location=="Floor 9" and .trade=="Structural"' >/dev/null \
  && pass "TC-15-042: detail carries location + trade" || fail "TC-15-042: location/trade missing"
echo "$RESP" | jq -e '.data.comments | type=="array" and length==0' >/dev/null \
  && pass "TC-15-043: detail comments[] empty initially" || fail "TC-15-043: comments not empty array"

# ── Add comment → author name populated on refetch ────────────────────────────
section "Comments"
RESP=$(api_post "$JAR" "$ORG_ID" "/issues/$IID/comments" "{\"body\":\"Looking into it now\"}")
assert_success "TC-15-050: POST comment → success" "$RESP"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues/$IID")
echo "$RESP" | jq -e '.data.comments | length==1' >/dev/null \
  && pass "TC-15-051: one comment after add" || fail "TC-15-051: comment count wrong"
echo "$RESP" | jq -e '.data.comments[0] | .body=="Looking into it now" and (.author|has("firstName"))' >/dev/null \
  && pass "TC-15-052: comment body + author name populated" || fail "TC-15-052: comment author/body wrong"

# ── Resolve / reopen ──────────────────────────────────────────────────────────
section "Resolve / reopen"
NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
RESP=$(api_patch "$JAR" "$ORG_ID" "/issues/$IID" "{\"status\":\"RESOLVED\",\"resolvedAt\":\"$NOW\"}")
assert_field "TC-15-060: PATCH → RESOLVED" "$RESP" ".data.status" "RESOLVED"
echo "$RESP" | jq -e '.data.resolvedAt != null' >/dev/null \
  && pass "TC-15-061: resolvedAt set" || fail "TC-15-061: resolvedAt null"
echo "$RESP" | jq -e '.data.createdBy | has("firstName")' >/dev/null \
  && pass "TC-15-062: PATCH return still populated (via findById)" || fail "TC-15-062: PATCH return not populated"
RESP=$(api_patch "$JAR" "$ORG_ID" "/issues/$IID" "{\"status\":\"OPEN\",\"resolvedAt\":null}")
assert_field "TC-15-070: PATCH → reopen OPEN" "$RESP" ".data.status" "OPEN"

# ── Seed 2 more issues for pagination / sort / summary / bulk ──────────────────
section "Triage console: seed extra issues"
RESP=$(api_post "$JAR" "$ORG_ID" "/issues" "{\"projectId\":\"$PID\",\"title\":\"Scaffold unsafe\",\"type\":\"SAFETY\",\"severity\":\"CRITICAL\"}")
CRIT=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-15-080: critical issue created" "$CRIT"
RESP=$(api_post "$JAR" "$ORG_ID" "/issues" "{\"projectId\":\"$PID\",\"title\":\"Paint touch-up\",\"type\":\"GENERAL\",\"severity\":\"LOW\"}")
LOW=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-15-081: low issue created" "$LOW"

# ── Pagination + filters + smart sort (scoped to our project = 3 issues) ──────
section "Pagination + filters + sort"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PID")
TOTAL=$(echo "$RESP" | jq -r '.data.total')
[ "$TOTAL" = "3" ] && pass "TC-15-082: total=3 for the project" || fail "TC-15-082: total expected 3, got '$TOTAL'"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PID&limit=1&skip=0")
echo "$RESP" | jq -e '(.data.items|length)==1 and .data.total==3' >/dev/null \
  && pass "TC-15-083: limit=1 returns 1 item but total=3" || fail "TC-15-083: pagination slice wrong"
# Default smart sort → an OPEN/CRITICAL ranks above a CLOSED/LOW. Our project is all OPEN,
# so the CRITICAL (Scaffold unsafe) should be first.
FIRST=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PID" | jq -r '.data.items[0].severity')
[ "$FIRST" = "CRITICAL" ] && pass "TC-15-084: smart sort floats CRITICAL to top" || fail "TC-15-084: top severity was '$FIRST'"
# type filter
RESP=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PID&type=SAFETY")
echo "$RESP" | jq -e ".data.items | length==1 and .[0].type==\"SAFETY\"" >/dev/null \
  && pass "TC-15-085: type=SAFETY filter" || fail "TC-15-085: type filter wrong"
# unassigned (NONE) — all three are unassigned
RESP=$(api_get "$JAR" "$ORG_ID" "/issues?projectId=$PID&assignedToId=NONE")
echo "$RESP" | jq -e '.data.total==3' >/dev/null \
  && pass "TC-15-086: assignedToId=NONE returns unassigned" || fail "TC-15-086: NONE filter wrong"

# ── Summary counts ────────────────────────────────────────────────────────────
section "Summary"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues/summary?projectId=$PID")
echo "$RESP" | jq -e '.data | has("open") and has("critical") and has("unassigned") and has("stale")' >/dev/null \
  && pass "TC-15-090: summary has triage counts" || fail "TC-15-090: summary shape wrong"
echo "$RESP" | jq -e '.data.open==3 and .data.critical==1 and .data.unassigned==3' >/dev/null \
  && pass "TC-15-091: summary counts correct (3 open, 1 critical, 3 unassigned)" || fail "TC-15-091: counts wrong: $(echo "$RESP" | jq -c '.data')"

# ── Bulk status change + reassign ─────────────────────────────────────────────
section "Bulk actions"
RESP=$(api_patch "$JAR" "$ORG_ID" "/issues/bulk" "{\"ids\":[\"$CRIT\",\"$LOW\"],\"status\":\"RESOLVED\"}")
echo "$RESP" | jq -e '.data.modified==2' >/dev/null \
  && pass "TC-15-100: bulk RESOLVED modified 2" || fail "TC-15-100: bulk modified wrong: $(echo "$RESP" | jq -c '.data')"
echo "$(api_get "$JAR" "$ORG_ID" "/issues/$CRIT")" | jq -e '.data.status=="RESOLVED" and .data.resolvedAt!=null' >/dev/null \
  && pass "TC-15-101: bulk-resolved issue persisted + resolvedAt stamped" || fail "TC-15-101: bulk resolve not persisted"
RESP=$(api_get "$JAR" "$ORG_ID" "/issues/summary?projectId=$PID")
echo "$RESP" | jq -e '.data.open==1 and .data.resolved==2' >/dev/null \
  && pass "TC-15-102: summary reflects bulk change (1 open, 2 resolved)" || fail "TC-15-102: summary post-bulk wrong: $(echo "$RESP" | jq -c '.data')"
# bulk reassign to self
ME=$(api_get "$JAR" "$ORG_ID" "/users/me" | jq -r '.data.id // .data._id')
RESP=$(api_patch "$JAR" "$ORG_ID" "/issues/bulk" "{\"ids\":[\"$CRIT\"],\"assignedToId\":\"$ME\"}")
echo "$(api_get "$JAR" "$ORG_ID" "/issues/$CRIT")" | jq -e --arg me "$ME" '.data.assignedToId==$me' >/dev/null \
  && pass "TC-15-103: bulk reassign persisted" || fail "TC-15-103: bulk reassign failed"

# ── Permission: CLIENT cannot bulk-update ─────────────────────────────────────
section "Bulk permission guard"
login "$JARC" "client@constructiq.com" "Demo@1234" >/dev/null
ORG_C=$(api_get "$JARC" "" "/users/me" 2>/dev/null | jq -r '.data.organizationId // empty')
CODE=$(http_status "$JARC" "$ORG_C" "PATCH" "/issues/bulk" "{\"ids\":[\"$CRIT\"],\"status\":\"OPEN\"}")
assert_status "TC-15-110: CLIENT bulk → 403" "403" "$CODE"

echo -e "\n${CYAN}QA 15 done — ${GREEN}${PASS} pass${NC} / ${RED}${FAIL} fail${NC}"
[ "$FAIL" -eq 0 ]
