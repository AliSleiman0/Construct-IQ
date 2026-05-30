#!/usr/bin/env bash
# QA 16 — PM: Daily Reports (real API, post-migration of /pm/reports)
# Verifies the shape ReportBoardList/ReportDetailView consume: org-wide list,
# populated createdBy/project NAMES, manpower/equipment entries, author-edit,
# and the unique (projectId, reportDate) → 409 conflict.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 16 — PM: Daily Reports${NC}"

JAR=$(make_jar)
PID=""
DATE="2026-05-19"

cleanup() {
  # Reports have no DELETE endpoint; dropping the scratch project is enough.
  [ -n "${ORG_ID:-}" ] && [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  cleanup_jar "$JAR"
}
trap cleanup EXIT

# ── Login + scratch project ───────────────────────────────────────────────────
section "PM Login + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-16-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-16-002: organizationId present" "$ORG_ID"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA16 Reports $(date +%s)\",\"code\":\"QA16\",\"status\":\"ACTIVE\",\"totalBudget\":500000,\"currency\":\"USD\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-16-003: scratch projectId present" "$PID"

# ── Create report (projectId in body, rich entries) ───────────────────────────
section "Create report"
RESP=$(api_post "$JAR" "$ORG_ID" "/reports" "{\"projectId\":\"$PID\",\"reportDate\":\"$DATE\",\"weather\":\"SUNNY\",\"highTempC\":24,\"lowTempC\":12,\"workCompleted\":\"Deck pour L11\",\"manpowerEntries\":[{\"trade\":\"Concrete\",\"count\":8}],\"equipmentEntries\":[{\"name\":\"Tower Crane #1\",\"hours\":8}]}")
assert_success "TC-16-010: POST /reports → success" "$RESP"
RID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-16-011: reportId present" "$RID"

# ── Org-wide list carries populated names ─────────────────────────────────────
section "Org-wide list shape"
RESP=$(api_get "$JAR" "$ORG_ID" "/reports")
assert_success "TC-16-020: GET /reports (org-wide) → success" "$RESP"
ROW=$(echo "$RESP" | jq -c ".data[] | select((.id // ._id) == \"$RID\")")
assert_not_empty "TC-16-021: created report present in org-wide list" "$ROW"
echo "$ROW" | jq -e '.createdBy | has("firstName")' >/dev/null \
  && pass "TC-16-022: list row carries createdBy name" || fail "TC-16-022: createdBy not populated"
echo "$ROW" | jq -e '.project | has("name")' >/dev/null \
  && pass "TC-16-023: list row carries project.name" || fail "TC-16-023: project not populated"

# ── projectId filter ──────────────────────────────────────────────────────────
section "projectId filter"
RESP=$(api_get "$JAR" "$ORG_ID" "/reports?projectId=$PID")
echo "$RESP" | jq -e ".data[] | select((.id // ._id) == \"$RID\")" >/dev/null \
  && pass "TC-16-030: report present when filtered by projectId" || fail "TC-16-030: missing under projectId filter"

# ── Detail shape ──────────────────────────────────────────────────────────────
section "Detail shape"
RESP=$(api_get "$JAR" "$ORG_ID" "/reports/$RID")
assert_success "TC-16-040: GET /reports/:id → success" "$RESP"
echo "$RESP" | jq -e '.data.createdBy | has("firstName")' >/dev/null \
  && pass "TC-16-041: detail createdBy populated" || fail "TC-16-041: detail createdBy missing"
echo "$RESP" | jq -e '.data.manpowerEntries | length==1' >/dev/null \
  && pass "TC-16-042: detail carries manpowerEntries" || fail "TC-16-042: manpowerEntries missing"

# ── Duplicate (projectId, reportDate) → 409 ───────────────────────────────────
section "Unique-day conflict"
CODE=$(http_status "$JAR" "$ORG_ID" POST "/reports" "{\"projectId\":\"$PID\",\"reportDate\":\"$DATE\",\"workCompleted\":\"dup\"}")
assert_status "TC-16-050: duplicate same project+date → 409" "409" "$CODE"

# ── Author edit ───────────────────────────────────────────────────────────────
section "Author edit"
RESP=$(api_patch "$JAR" "$ORG_ID" "/reports/$RID" "{\"notes\":\"edited by author\"}")
assert_field "TC-16-060: PATCH notes (author)" "$RESP" ".data.notes" "edited by author"
echo "$RESP" | jq -e '.data.createdBy | has("firstName")' >/dev/null \
  && pass "TC-16-061: PATCH return still populated (via findById)" || fail "TC-16-061: PATCH return not populated"

echo -e "\n${CYAN}QA 16 done — ${GREEN}${PASS} pass${NC} / ${RED}${FAIL} fail${NC}"
[ "$FAIL" -eq 0 ]
