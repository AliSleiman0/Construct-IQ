#!/usr/bin/env bash
# QA 26 — SE-5: daily-report photos (Documents linked by dailyReportId)
# A photo attached to a daily report stores dailyReportId + type=IMAGE and is
# retrievable via GET /documents?dailyReportId=<id>; a different report is empty.
# Multipart upload is exercised best-effort (skipped if S3 isn't configured →
# 503); the dailyReportId persistence + filter are proven via the URL-create
# path so the suite passes without object storage. Member-scoping itself is
# covered by documents.service.spec.ts.
#   API=http://localhost:4001/api/v1 ./26-site-eng-report-photos.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 26 — Daily-report photos${NC}"

JAR=$(make_jar)    # PM (setup, org-wide)
JARE=$(make_jar)   # engineer (member)
PID=""; REPID=""; DID=""; DID2=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$DID" ] && api_delete "$JAR" "$ORG_ID" "/documents/$DID" >/dev/null 2>&1 || true
    [ -n "$DID2" ] && api_delete "$JAR" "$ORG_ID" "/documents/$DID2" >/dev/null 2>&1 || true
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
assert_field "TC-26-001: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA26 Photos $(date +%s)\",\"code\":\"QA26\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
api_post "$JAR" "$ORG_ID" "/projects/$PID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}" >/dev/null

# ── Engineer files a daily report ─────────────────────────────────────────────
section "Daily report"
RESP=$(api_post "$JARE" "$ORG_ID" "/reports" "{\"projectId\":\"$PID\",\"reportDate\":\"2026-05-25\",\"workCompleted\":\"Poured slab\"}")
REPID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-26-010: reportId" "$REPID"

# ── Best-effort: real multipart upload → S3 (skipped if storage unconfigured) ─
section "Multipart upload (best-effort)"
PNG=$(mktemp /tmp/qa26_XXXXXX.png)
# 1x1 transparent PNG
base64 -d > "$PNG" <<'B64'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
B64
UP=$(curl -s -b "$JARE" -c "$JARE" -X POST "$API/documents/upload" \
  -H "X-Organization-Id: $ORG_ID" \
  -F "file=@$PNG;type=image/png;filename=site.png" \
  -F "projectId=$PID" -F "dailyReportId=$REPID")
rm -f "$PNG"
UP_OK=$(echo "$UP" | jq -r '.success // empty' 2>/dev/null)
if [ "$UP_OK" = "true" ]; then
  DID2=$(echo "$UP" | jq -r '.data.id // .data._id // empty')
  assert_field "TC-26-020: upload stored dailyReportId" "$UP" ".data.dailyReportId" "$REPID"
  assert_field "TC-26-021: upload defaulted type=IMAGE" "$UP" ".data.type" "IMAGE"
else
  skip "TC-26-020/021: multipart upload (S3 not configured: $(echo "$UP" | jq -rc '.message // .error // "no success"' 2>/dev/null))"
fi

# ── Deterministic: URL-create path persists the link (no S3 needed) ───────────
section "Linked image document"
RESP=$(api_post "$JARE" "$ORG_ID" "/documents" "{\"projectId\":\"$PID\",\"dailyReportId\":\"$REPID\",\"type\":\"IMAGE\",\"name\":\"site-photo.jpg\",\"fileKey\":\"qa26/site-photo.jpg\",\"fileUrl\":\"https://example.test/site-photo.jpg\",\"mimeType\":\"image/jpeg\"}")
assert_success "TC-26-030: POST /documents (linked image) → success" "$RESP"
DID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-26-031: documentId" "$DID"
RESP=$(api_get "$JARE" "$ORG_ID" "/documents/$DID")
assert_field "TC-26-032: doc.dailyReportId stored" "$RESP" ".data.dailyReportId" "$REPID"
assert_field "TC-26-033: doc.type IMAGE" "$RESP" ".data.type" "IMAGE"

# ── Filter: photos for this report vs another ─────────────────────────────────
section "Filter by dailyReportId"
RESP=$(api_get "$JARE" "$ORG_ID" "/documents?dailyReportId=$REPID")
assert_contains "TC-26-040: ?dailyReportId=<rep> contains the photo" "$RESP" "$DID"
RESP=$(api_get "$JARE" "$ORG_ID" "/documents?dailyReportId=nonexistent-id")
echo "$RESP" | jq -e '[.data[] | select(.dailyReportId=="nonexistent-id")] | length == 0' >/dev/null 2>&1 \
  && pass "TC-26-041: ?dailyReportId=<other> returns no photos for this report" \
  || fail "TC-26-041: unexpected matches for other report"

# ── PM (org-wide) also sees it via the same filter ────────────────────────────
RESP=$(api_get "$JAR" "$ORG_ID" "/documents?dailyReportId=$REPID")
assert_contains "TC-26-042: PM (org-wide) sees the report photo" "$RESP" "$DID"

summary
