#!/usr/bin/env bash
# QA 13 — PM: Phases & Milestones (Timeline API surface)
# Self-contained: scratch project → phase + milestone CRUD/validation/isolation → cleanup.
# Routes are nested under the project: /projects/:projectId/{phases,milestones}
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 13 — PM: Phases & Milestones${NC}"

JAR=$(make_jar)
JARB=$(make_jar)   # Company B PM — cross-org isolation
PID=""

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_ID:-}" ]; then
    api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARB"
}
trap cleanup EXIT

# ── Login + scratch project ───────────────────────────────────────────────────
section "PM Login + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-13-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-13-002: organizationId present" "$ORG_ID"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA13 Timeline $(date +%s)\",\"code\":\"QA13\",\"status\":\"PLANNING\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-13-003: scratch projectId present" "$PID"

# ── Phase CRUD ────────────────────────────────────────────────────────────────
section "Phase CRUD"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/phases" '{"name":"Foundation","status":"PLANNING","startDate":"2026-03-01","endDate":"2026-06-30","order":0}')
assert_field "TC-13-010: POST phase → success" "$RESP" ".success" "true"
PHID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-13-011: created phase id" "$PHID"

RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID/phases")
assert_success "TC-13-012: GET phases → success" "$RESP"
assert_contains "TC-13-013: phase list contains created phase" "$RESP" "$PHID"

# PATCH reuses CreatePhaseDto (name required) — mirror the full object the UI sends.
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/phases/$PHID" '{"name":"Foundation","status":"ACTIVE","startDate":"2026-03-01","endDate":"2026-06-30"}')
assert_field "TC-13-014: PATCH phase status → ACTIVE" "$RESP" ".data.status" "ACTIVE"

# ── Phase dependencies (finish-to-start, mirrors Task.dependsOnTaskIds) ────────
section "Phase dependencies"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/phases" "{\"name\":\"Framing\",\"status\":\"PLANNING\",\"dependsOnPhaseIds\":[\"$PHID\"]}")
PHID2=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-13-015: created dependent phase id" "$PHID2"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID/phases")
echo "$RESP" | jq -e --arg p "$PHID2" --arg d "$PHID" '.data[] | select((.id // ._id)==$p) | .dependsOnPhaseIds | index($d) != null' >/dev/null \
  && pass "TC-13-016: dependsOnPhaseIds persisted in list" || fail "TC-13-016: dependsOnPhaseIds not persisted"
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/phases/$PHID2" '{"name":"Framing","dependsOnPhaseIds":[]}')
echo "$RESP" | jq -e '.data.dependsOnPhaseIds | length == 0' >/dev/null \
  && pass "TC-13-017: PATCH clears dependsOnPhaseIds" || fail "TC-13-017: deps not cleared"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/phases" '{"name":"Bad","dependsOnPhaseIds":"not-an-array"}')
assert_status "TC-13-018: non-array dependsOnPhaseIds → 400" "400" "$CODE"
# PATCH now uses PartialType — `name` is no longer required on update.
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/phases/$PHID" '{"status":"ON_HOLD"}')
assert_field "TC-13-019: PATCH phase without name → ON_HOLD (PartialType)" "$RESP" ".data.status" "ON_HOLD"

# ── Phase validation ──────────────────────────────────────────────────────────
section "Phase validation"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/phases" '{"status":"PLANNING"}')
assert_status "TC-13-020: phase missing name → 400" "400" "$CODE"
# Regression guard: TaskStatus values (e.g. IN_PROGRESS) are NOT valid PhaseStatus.
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/phases" '{"name":"X","status":"IN_PROGRESS"}')
assert_status "TC-13-021: phase status IN_PROGRESS rejected → 400" "400" "$CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/phases" '{"name":"X","order":-1}')
assert_status "TC-13-022: phase order < 0 → 400" "400" "$CODE"

# ── Milestone CRUD ────────────────────────────────────────────────────────────
section "Milestone CRUD"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/milestones" "{\"name\":\"Permit Approval\",\"status\":\"PENDING\",\"targetDate\":\"2026-04-15\",\"percentComplete\":0,\"phaseId\":\"$PHID\"}")
assert_field "TC-13-030: POST milestone → success" "$RESP" ".success" "true"
MSID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-13-031: created milestone id" "$MSID"

RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID/milestones")
assert_success "TC-13-032: GET milestones → success" "$RESP"
assert_contains "TC-13-033: milestone list contains created milestone" "$RESP" "$MSID"

RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/milestones/$MSID" '{"name":"Permit Approval","status":"COMPLETED","percentComplete":100}')
assert_field "TC-13-034: PATCH milestone status → COMPLETED" "$RESP" ".data.status" "COMPLETED"
assert_field "TC-13-035: percentComplete persisted" "$RESP" ".data.percentComplete" "100"

# Major-milestone flag (large diamond on the timeline) — defaults false, PATCH toggles it.
assert_field "TC-13-036: milestone defaults isMajor=false" "$RESP" ".data.isMajor" "false"
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/milestones/$MSID" '{"name":"Permit Approval","isMajor":true}')
assert_field "TC-13-037: PATCH isMajor → true" "$RESP" ".data.isMajor" "true"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID/milestones")
echo "$RESP" | jq -e --arg m "$MSID" '.data[] | select((.id // ._id)==$m) | .isMajor==true' >/dev/null \
  && pass "TC-13-038: isMajor persisted in list" || fail "TC-13-038: isMajor not persisted"

# Milestone dependencies (finish-to-start, mirrors Task.dependsOnTaskIds).
RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/milestones" "{\"name\":\"Handover\",\"status\":\"PENDING\",\"targetDate\":\"2026-07-15\",\"dependsOnMilestoneIds\":[\"$MSID\"]}")
MSID2=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-13-045: created dependent milestone id" "$MSID2"
RESP=$(api_get "$JAR" "$ORG_ID" "/projects/$PID/milestones")
echo "$RESP" | jq -e --arg m "$MSID2" --arg d "$MSID" '.data[] | select((.id // ._id)==$m) | .dependsOnMilestoneIds | index($d) != null' >/dev/null \
  && pass "TC-13-046: dependsOnMilestoneIds persisted in list" || fail "TC-13-046: dependsOnMilestoneIds not persisted"
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/milestones/$MSID2" '{"name":"Handover","dependsOnMilestoneIds":[]}')
echo "$RESP" | jq -e '.data.dependsOnMilestoneIds | length == 0' >/dev/null \
  && pass "TC-13-047: PATCH clears dependsOnMilestoneIds" || fail "TC-13-047: deps not cleared"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/milestones" '{"name":"Bad","dependsOnMilestoneIds":"nope"}')
assert_status "TC-13-048: non-array dependsOnMilestoneIds → 400" "400" "$CODE"
# PATCH now uses PartialType — `name` is no longer required on update.
RESP=$(api_patch "$JAR" "$ORG_ID" "/projects/$PID/milestones/$MSID" '{"percentComplete":25}')
assert_field "TC-13-049: PATCH milestone without name → 25% (PartialType)" "$RESP" ".data.percentComplete" "25"

# ── Milestone validation ──────────────────────────────────────────────────────
section "Milestone validation"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/milestones" '{"status":"PENDING"}')
assert_status "TC-13-040: milestone missing name → 400" "400" "$CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/milestones" '{"name":"X","status":"NOPE"}')
assert_status "TC-13-041: milestone bad status → 400" "400" "$CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/milestones" '{"name":"X","percentComplete":150}')
assert_status "TC-13-042: percentComplete > 100 → 400" "400" "$CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "POST" "/projects/$PID/milestones" '{"name":"X","percentComplete":-5}')
assert_status "TC-13-043: percentComplete < 0 → 400" "400" "$CODE"

# ── Multi-tenancy isolation ───────────────────────────────────────────────────
section "Multi-tenancy isolation"
RESP=$(login "$JARB" "pm@companyb.com" "Demo@1234")
ORG_B=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
if [ -n "$ORG_B" ]; then
  # The phases query is project + org scoped, so a cross-org GET is safe whether
  # it 403/404s OR returns 200 with an EMPTY list (no other-org rows leak). Assert
  # no-leak rather than a specific status.
  XBODY=$(api_get "$JARB" "$ORG_B" "/projects/$PID/phases")
  CODE=$(http_status "$JARB" "$ORG_B" "GET" "/projects/$PID/phases")
  if [ "$CODE" = "403" ] || [ "$CODE" = "404" ]; then
    pass "TC-13-050: cross-org GET phases denied (HTTP $CODE)"
  elif [ "$CODE" = "200" ] && echo "$XBODY" | jq -e '(.data | length) == 0' >/dev/null 2>&1 && ! echo "$XBODY" | grep -q "$PHID"; then
    pass "TC-13-050: cross-org GET phases → 200 + empty, no data leak"
  else
    fail "TC-13-050: cross-org GET phases — possible leak (HTTP $CODE): $XBODY"
  fi
  CODE=$(http_status "$JARB" "$ORG_B" "PATCH" "/projects/$PID/milestones/$MSID" '{"name":"Permit Approval","status":"PENDING"}')
  { [ "$CODE" = "403" ] || [ "$CODE" = "404" ]; } \
    && pass "TC-13-051: cross-org PATCH milestone denied (HTTP $CODE)" \
    || fail "TC-13-051: cross-org PATCH milestone — expected 403/404, got $CODE"
else
  skip "TC-13-050..051: Company B PM unavailable (run 'npm run seed' to enable cross-org tests)"
fi

# ── Delete ────────────────────────────────────────────────────────────────────
section "Delete phase + milestone"
CODE=$(http_status "$JAR" "$ORG_ID" "DELETE" "/projects/$PID/milestones/$MSID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } \
  && pass "TC-13-060: DELETE milestone (HTTP $CODE)" \
  || fail "TC-13-060: DELETE milestone — expected 200/204, got $CODE"
CODE=$(http_status "$JAR" "$ORG_ID" "DELETE" "/projects/$PID/phases/$PHID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } \
  && pass "TC-13-061: DELETE phase (HTTP $CODE)" \
  || fail "TC-13-061: DELETE phase — expected 200/204, got $CODE"

summary
