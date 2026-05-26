#!/usr/bin/env bash
# QA 12 — PM: Tasks (Kanban board API surface)
# Self-contained: creates a scratch project, exercises task CRUD/status/filters/
# validation/isolation/permissions, then deletes the scratch project.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 12 — PM: Tasks${NC}"

JAR=$(make_jar)          # PM (org A)
JARB=$(make_jar)         # PM (Company B) — cross-org isolation
JARC=$(make_jar)         # CLIENT (read-only) — permission gating
PID=""

cleanup() {
  # Best-effort teardown of the scratch project (cascades children).
  if [ -n "$PID" ] && [ -n "${ORG_ID:-}" ]; then
    api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARB"; cleanup_jar "$JARC"
}
trap cleanup EXIT

# ── Login ───────────────────────────────────────────────────────────────────
section "PM Login"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-12-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-12-002: organizationId present" "$ORG_ID"

# ── Scratch project ───────────────────────────────────────────────────────────
section "Scratch project fixture"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA12 Tasks $(date +%s)\",\"code\":\"QA12\",\"status\":\"PLANNING\"}")
assert_field "TC-12-003: create scratch project" "$RESP" ".success" "true"
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-12-004: scratch projectId present" "$PID"

# ── Task CRUD ─────────────────────────────────────────────────────────────────
section "Task CRUD"
RESP=$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"title\":\"QA task A\",\"projectId\":\"$PID\",\"status\":\"TODO\",\"priority\":\"MEDIUM\"}")
assert_field "TC-12-010: POST /tasks → success" "$RESP" ".success" "true"
TID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-12-011: created task id" "$TID"

RESP=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PID")
assert_success "TC-12-012: GET /tasks?projectId → success" "$RESP"
assert_contains "TC-12-013: list contains created task" "$RESP" "$TID"

RESP=$(api_patch "$JAR" "$ORG_ID" "/tasks/$TID" '{"title":"QA task A (edited)","priority":"HIGH"}')
assert_field "TC-12-014: PATCH title/priority → success" "$RESP" ".success" "true"
assert_field "TC-12-015: priority persisted" "$RESP" ".data.priority" "HIGH"

# ── Status transitions (the drag path) ────────────────────────────────────────
section "Status transitions (board drag)"
for ST in IN_PREPARATION IN_PROGRESS REVIEW DONE; do
  RESP=$(api_patch "$JAR" "$ORG_ID" "/tasks/$TID" "{\"status\":\"$ST\"}")
  assert_field "TC-12-02x: PATCH status → $ST" "$RESP" ".data.status" "$ST"
done

# ── Filters ───────────────────────────────────────────────────────────────────
section "Filters"
RESP=$(api_patch "$JAR" "$ORG_ID" "/tasks/$TID" '{"status":"IN_PROGRESS"}')
RESP=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PID&status=IN_PROGRESS")
assert_success "TC-12-030: GET /tasks filtered by status → success" "$RESP"
assert_contains "TC-12-031: filtered list contains the IN_PROGRESS task" "$RESP" "$TID"
RESP=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PID&status=DONE")
assert_not_contains "TC-12-032: DONE filter excludes the IN_PROGRESS task" "$RESP" "$TID"

# ── Validation (400) — message body is nulled by the filter, assert status ────
section "Validation"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/tasks" "{\"projectId\":\"$PID\",\"status\":\"TODO\"}")
assert_status "TC-12-040: missing title → 400" "400" "$CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/tasks" "{\"title\":\"x\",\"projectId\":\"$PID\",\"status\":\"NOPE\"}")
assert_status "TC-12-041: bad status enum → 400" "400" "$CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/tasks" "{\"title\":\"x\",\"projectId\":\"$PID\",\"priority\":\"NOPE\"}")
assert_status "TC-12-042: bad priority enum → 400" "400" "$CODE"
# Backend DTO caps title at @MaxLength(300); exceed it to force a 400.
BIG=$(printf 'x%.0s' {1..350})
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/tasks" "{\"title\":\"$BIG\",\"projectId\":\"$PID\"}")
assert_status "TC-12-043: title > 300 chars → 400" "400" "$CODE"

# ── Multi-tenancy (Company B PM must not reach org A's task) ───────────────────
section "Multi-tenancy isolation"
RESP=$(login "$JARB" "pm@companyb.com" "Demo@1234")
ORG_B=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
if [ -n "$ORG_B" ]; then
  # Listing tasks for a foreign projectId must not leak the task.
  RESP=$(api_get "$JARB" "$ORG_B" "/tasks?projectId=$PID")
  assert_not_contains "TC-12-050: cross-org task list does not leak task" "$RESP" "$TID"
  # Mutating/deleting a foreign task must be denied (403 or 404).
  CODE=$(http_status "$JARB" "$ORG_B" "PATCH" "/tasks/$TID" '{"status":"DONE"}')
  { [ "$CODE" = "403" ] || [ "$CODE" = "404" ]; } \
    && pass "TC-12-051: cross-org PATCH task denied (HTTP $CODE)" \
    || fail "TC-12-051: cross-org PATCH task — expected 403/404, got $CODE"
  CODE=$(http_status "$JARB" "$ORG_B" "DELETE" "/tasks/$TID")
  { [ "$CODE" = "403" ] || [ "$CODE" = "404" ]; } \
    && pass "TC-12-052: cross-org DELETE task denied (HTTP $CODE)" \
    || fail "TC-12-052: cross-org DELETE task — expected 403/404, got $CODE"
else
  skip "TC-12-050..052: Company B PM unavailable (run 'npm run seed' to enable cross-org tests)"
fi

# ── Permission gating (CLIENT cannot create tasks) ────────────────────────────
section "Permission gating"
RESP=$(login "$JARC" "client@constructiq.com" "Demo@1234")
ORG_C=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
if [ -n "$ORG_C" ]; then
  CODE=$(http_status "$JARC" "$ORG_C" "POST" "/tasks" "{\"title\":\"nope\",\"projectId\":\"$PID\"}")
  assert_status "TC-12-060: CLIENT POST /tasks → 403" "403" "$CODE"
else
  skip "TC-12-060: CLIENT login unavailable"
fi

# ── Card-order persistence (PATCH /tasks/reorder) ─────────────────────────────
section "Reorder persistence"
RA=$(echo "$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"title\":\"QA order A\",\"projectId\":\"$PID\",\"status\":\"TODO\"}")" | jq -r '.data.id // .data._id')
RB=$(echo "$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"title\":\"QA order B\",\"projectId\":\"$PID\",\"status\":\"TODO\"}")" | jq -r '.data.id // .data._id')
RC=$(echo "$(api_post "$JAR" "$ORG_ID" "/tasks" "{\"title\":\"QA order C\",\"projectId\":\"$PID\",\"status\":\"TODO\"}")" | jq -r '.data.id // .data._id')
assert_not_empty "TC-12-080: three TODO tasks created" "$RA$RB$RC"

# Reverse the column order: C, B, A.
RESP=$(api_patch "$JAR" "$ORG_ID" "/tasks/reorder" "{\"status\":\"TODO\",\"taskIds\":[\"$RC\",\"$RB\",\"$RA\"]}")
assert_field "TC-12-081: PATCH /tasks/reorder → success" "$RESP" ".success" "true"

# The list (sorted by position asc) must return C, B, A among our three ids.
RESP=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PID&status=TODO")
ORDER=$(echo "$RESP" | jq -r --arg a "$RA" --arg b "$RB" --arg c "$RC" \
  '[.data[] | (.id // ._id)] | map(select(. == $a or . == $b or . == $c)) | join(",")')
[ "$ORDER" = "$RC,$RB,$RA" ] \
  && pass "TC-12-082: reorder persisted (C,B,A)" \
  || fail "TC-12-082: reorder order wrong — expected '$RC,$RB,$RA', got '$ORDER'"

# Reorder into DONE stamps completedAt.
RESP=$(api_patch "$JAR" "$ORG_ID" "/tasks/reorder" "{\"status\":\"DONE\",\"taskIds\":[\"$RA\"]}")
assert_field "TC-12-083: reorder into DONE → success" "$RESP" ".success" "true"
RESP=$(api_get "$JAR" "$ORG_ID" "/tasks?projectId=$PID&status=DONE")
CA=$(echo "$RESP" | jq -r --arg a "$RA" '.data[] | select((.id // ._id) == $a) | .completedAt // "null"')
{ [ -n "$CA" ] && [ "$CA" != "null" ]; } \
  && pass "TC-12-084: completedAt stamped on reorder into DONE ($CA)" \
  || fail "TC-12-084: completedAt not set after reorder into DONE (got '$CA')"

# CLIENT (read-only) cannot reorder.
if [ -n "${ORG_C:-}" ]; then
  CODE=$(http_status "$JARC" "$ORG_C" "PATCH" "/tasks/reorder" "{\"status\":\"TODO\",\"taskIds\":[\"$RA\"]}")
  assert_status "TC-12-085: CLIENT reorder → 403" "403" "$CODE"
fi

# ── Comments ──────────────────────────────────────────────────────────────────
section "Comments"
RESP=$(api_post "$JAR" "$ORG_ID" "/tasks/$TID/comments" '{"body":"QA inspection passed"}')
assert_field "TC-12-090: POST comment → success" "$RESP" ".success" "true"
CBODY=$(echo "$RESP" | jq -r '.data.body // empty')
[ "$CBODY" = "QA inspection passed" ] \
  && pass "TC-12-091: comment body echoed back" \
  || fail "TC-12-091: comment body wrong — got '$CBODY'"
# GET /tasks/:id hydrates comments[].author (firstName populated).
RESP=$(api_get "$JAR" "$ORG_ID" "/tasks/$TID")
LEN=$(echo "$RESP" | jq -r '.data.comments | length')
[ "$LEN" = "1" ] && pass "TC-12-092: detail returns 1 comment" \
  || fail "TC-12-092: expected 1 comment, got '$LEN'"
echo "$RESP" | jq -e '.data.comments[0] | has("author") and (.author.firstName | type=="string")' >/dev/null \
  && pass "TC-12-093: comment author hydrated (firstName)" \
  || fail "TC-12-093: comment author not hydrated"
# Comment on a non-existent task → 404.
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/tasks/ghost-task-id/comments" '{"body":"nope"}')
assert_status "TC-12-094: comment on missing task → 404" "404" "$CODE"

# ── Delete + 404 ──────────────────────────────────────────────────────────────
section "Delete"
CODE=$(http_status "$JAR" "$ORG_ID" "DELETE" "/tasks/$TID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } \
  && pass "TC-12-070: DELETE task (HTTP $CODE)" \
  || fail "TC-12-070: DELETE task — expected 200/204, got $CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "GET" "/tasks/$TID")
assert_status "TC-12-071: GET deleted task → 404" "404" "$CODE"

summary
