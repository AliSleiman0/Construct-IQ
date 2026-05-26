#!/usr/bin/env bash
# QA 24 — Member-scoping of Documents + Progress-photos (the P0 leak fix)
# Field roles must only see docs/photos for projects they belong to; managers
# with manage:documents stay org-wide.
#   API=http://localhost:4001/api/v1 ./24-site-eng-docs-photos.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 24 — Documents + Progress-photos member-scoping${NC}"

JAR=$(make_jar)    # PM (manage:documents → org-wide)
JARE=$(make_jar)   # engineer (read/upload:documents → member-scoped)
PID=""; DOCID=""; PHID=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$DOCID" ] && api_delete "$JAR" "$ORG_ID" "/documents/$DOCID" >/dev/null 2>&1 || true
    [ -n "$PHID" ] && api_delete "$JAR" "$ORG_ID" "/progress-photos/$PHID" >/dev/null 2>&1 || true
    [ -n "$PID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARE"
}
trap cleanup EXIT

# ── Setup: scratch project the engineer is NOT a member of ───────────────────
section "Setup"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-24-001: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA24 Scope $(date +%s)\",\"code\":\"QA24\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-24-002: scratch projectId" "$PID"

# PM records a document (metadata) + a progress-photo on the scratch project.
RESP=$(api_post "$JAR" "$ORG_ID" "/documents" "{\"projectId\":\"$PID\",\"name\":\"Level3 drawing\",\"fileKey\":\"qa24/dwg.pdf\",\"type\":\"DRAWING\"}")
DOCID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-24-003: scratch documentId" "$DOCID"
RESP=$(api_post "$JAR" "$ORG_ID" "/progress-photos" "{\"projectId\":\"$PID\",\"url\":\"http://x/p.jpg\",\"takenAt\":\"2026-05-22\",\"caption\":\"deck\"}")
PHID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-24-004: scratch photoId" "$PHID"

# ── PM (manage:documents) sees them org-wide ─────────────────────────────────
section "PM sees scratch docs/photos org-wide"
RESP=$(api_get "$JAR" "$ORG_ID" "/documents?projectId=$PID")
assert_contains "TC-24-010: PM documents list contains scratch doc" "$RESP" "$DOCID"
RESP=$(api_get "$JAR" "$ORG_ID" "/progress-photos?projectId=$PID")
assert_contains "TC-24-011: PM photos list contains scratch photo" "$RESP" "$PHID"

# ── Engineer (non-member) must NOT see them ──────────────────────────────────
section "Engineer does NOT see non-member docs/photos"
RESP=$(api_get "$JARE" "$ORG_ID" "/documents")
assert_not_contains "TC-24-020: engineer org-wide documents exclude scratch doc" "$RESP" "$DOCID"
RESP=$(api_get "$JARE" "$ORG_ID" "/documents?projectId=$PID")
echo "$RESP" | jq -e '.data | length == 0' >/dev/null \
  && pass "TC-24-021: engineer ?projectId=<non-member> docs → empty" || fail "TC-24-021: leaked docs"
RESP=$(api_get "$JARE" "$ORG_ID" "/progress-photos?projectId=$PID")
echo "$RESP" | jq -e '.data | length == 0' >/dev/null \
  && pass "TC-24-022: engineer ?projectId=<non-member> photos → empty" || fail "TC-24-022: leaked photos"

# ── After membership → visible ───────────────────────────────────────────────
section "After membership is granted"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}")
assert_success "TC-24-030: PM adds engineer to scratch project" "$RESP"
RESP=$(api_get "$JARE" "$ORG_ID" "/documents?projectId=$PID")
assert_contains "TC-24-031: engineer now sees scratch doc" "$RESP" "$DOCID"
RESP=$(api_get "$JARE" "$ORG_ID" "/progress-photos?projectId=$PID")
assert_contains "TC-24-032: engineer now sees scratch photo" "$RESP" "$PHID"

summary
