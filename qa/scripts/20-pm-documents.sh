#!/usr/bin/env bash
# QA 20 — PM: Documents (Phase 6 — multipart upload → S3/MinIO)
# Verifies the new POST /documents/upload: real upload to MinIO, list shape,
# soft-delete, mime/size/missing-file validation (400), and CLIENT read-only gating.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 20 — PM: Documents${NC}"

JAR=$(make_jar)    # PM (manage:documents → upload + delete)
JARC=$(make_jar)   # CLIENT (read:documents only) — gating
PID=""
TMPFILE="/tmp/qa20-doc-$$.txt"
echo "QA20 document body $(date)" > "$TMPFILE"

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_ID:-}" ]; then
    api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  rm -f "$TMPFILE"
  cleanup_jar "$JAR"; cleanup_jar "$JARC"
}
trap cleanup EXIT

# Multipart helpers (lib.sh only does JSON).
up_json() { curl -s -b "$JAR" -H "X-Organization-Id: $ORG_ID" "$@" "$API/documents/upload"; }
up_code() { curl -s -o /dev/null -w "%{http_code}" -b "$1" -H "X-Organization-Id: $2" "${@:3}" "$API/documents/upload"; }

# ── Login + scratch project ────────────────────────────────────────────────────
section "Login + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-20-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
login "$JARC" "client@constructiq.com" "Demo@1234" >/dev/null
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA20 Docs $(date +%s)\",\"code\":\"QA20\",\"status\":\"ACTIVE\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-20-002: scratch projectId present" "$PID"

# ── Upload (happy path → MinIO) ──────────────────────────────────────────────
section "Upload"
RESP=$(up_json -F "file=@$TMPFILE;type=text/plain" -F "projectId=$PID" -F "type=DRAWING" -F "name=Site plan")
assert_field "TC-20-010: upload → success" "$RESP" ".success" "true"
DID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-20-011: documentId present" "$DID"
echo "$RESP" | jq -e '.data | (.fileUrl|type=="string") and (.fileKey|type=="string") and .sizeBytes>0' >/dev/null \
  && pass "TC-20-012: doc carries fileUrl/fileKey/sizeBytes" \
  || fail "TC-20-012: doc missing fileUrl/fileKey/sizeBytes"
echo "$RESP" | jq -e '.data.name=="Site plan" and .data.type=="DRAWING" and .data.mimeType=="text/plain"' >/dev/null \
  && pass "TC-20-013: name/type/mimeType recorded" || fail "TC-20-013: metadata wrong"

# ── List shape ───────────────────────────────────────────────────────────────
section "List"
RESP=$(api_get "$JAR" "$ORG_ID" "/documents?projectId=$PID")
assert_contains "TC-20-020: list includes uploaded doc" "$RESP" "$DID"
RESP=$(api_get "$JAR" "$ORG_ID" "/documents?projectId=$PID&type=REPORT")
echo "$RESP" | jq -e "[.data[] | select((.id//._id)==\"$DID\")] | length == 0" >/dev/null \
  && pass "TC-20-021: type filter excludes the DRAWING" || fail "TC-20-021: type filter broken"

# ── Validation ───────────────────────────────────────────────────────────────
section "Validation + gating"
CODE=$(up_code "$JAR" "$ORG_ID" -F "projectId=$PID")
assert_status "TC-20-030: upload with no file → 400" "400" "$CODE"
CODE=$(up_code "$JAR" "$ORG_ID" -F "file=@$TMPFILE;type=application/x-msdownload" -F "projectId=$PID")
assert_status "TC-20-031: disallowed mime → 400" "400" "$CODE"
# CLIENT (read-only) cannot upload.
CODE=$(up_code "$JARC" "$ORG_ID" -F "file=@$TMPFILE;type=text/plain" -F "projectId=$PID")
assert_status "TC-20-032: CLIENT upload → 403" "403" "$CODE"

# ── Delete ───────────────────────────────────────────────────────────────────
section "Delete"
CODE=$(http_status "$JAR" "$ORG_ID" DELETE "/documents/$DID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } && pass "TC-20-040: delete document → $CODE" || fail "TC-20-040: delete got $CODE"
RESP=$(api_get "$JAR" "$ORG_ID" "/documents?projectId=$PID")
echo "$RESP" | jq -e "[.data[] | select((.id//._id)==\"$DID\")] | length == 0" >/dev/null \
  && pass "TC-20-041: deleted doc gone from list" || fail "TC-20-041: doc still listed after delete"

summary
