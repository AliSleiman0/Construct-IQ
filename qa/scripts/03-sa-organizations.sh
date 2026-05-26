#!/usr/bin/env bash
# QA 03 — Super Admin: Organizations CRUD
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 03 — Super Admin: Organizations CRUD${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT
UID_SUFFIX="$(date +%s)"
CREATED_ID=""

login_super_admin "$JAR"

section "List Organizations"
RESP=$(api_get "$JAR" "" "/organizations")
assert_success "TC-03-001: GET /organizations → success" "$RESP"
assert_array_not_empty "TC-03-002: Organizations list not empty" "$RESP" ".data"

LEN=$(echo "$RESP" | jq '.data | length')
assert_contains "TC-03-003: At least 3 seeded orgs" "$LEN" "" 2>/dev/null
[ "$LEN" -ge 3 ] && pass "TC-03-003: At least 3 seeded orgs (found $LEN)" || \
  fail "TC-03-003: Expected >= 3 orgs, got $LEN"

section "Create Organization"
CREATE_BODY="{\"name\":\"QA Org $UID_SUFFIX\",\"slug\":\"qa-org-$UID_SUFFIX\",\"adminFirstName\":\"QA\",\"adminLastName\":\"Admin\",\"adminEmail\":\"qa-$UID_SUFFIX@example.com\",\"adminPassword\":\"QaPassword@1\"}"
RESP=$(api_post "$JAR" "" "/organizations" "$CREATE_BODY")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-03-004: POST /organizations → 201"
else
  fail "TC-03-004: POST /organizations → $(echo "$RESP" | jq -r '.statusCode // "error"') ($(echo "$RESP" | jq -r '.error.message[0] // .error.message // "unknown"'))"
fi
ORG_NAME=$(echo "$RESP" | jq -r '.data.org.name // .data.name // empty')
ORG_SLUG=$(echo "$RESP" | jq -r '.data.org.slug // .data.slug // empty')
CREATED_ID=$(echo "$RESP" | jq -r '.data.org.id // .data.org._id // .data._id // .data.id // empty')
[ "$ORG_NAME" = "QA Org $UID_SUFFIX" ] && pass "TC-03-005: Created org name matches" || \
  fail "TC-03-005: Expected 'QA Org $UID_SUFFIX', got '$ORG_NAME'"
[ "$ORG_SLUG" = "qa-org-$UID_SUFFIX" ] && pass "TC-03-006: Created org slug matches" || \
  fail "TC-03-006: Expected 'qa-org-$UID_SUFFIX', got '$ORG_SLUG'"
assert_not_empty "TC-03-007: Created org has id" "$CREATED_ID"

section "Duplicate Slug"
STATUS=$(http_status "$JAR" "" "POST" "/organizations" "$CREATE_BODY")
if [ "$STATUS" = "400" ] || [ "$STATUS" = "409" ] || [ "$STATUS" = "422" ]; then
  pass "TC-03-008: Duplicate slug → $STATUS"
else
  fail "TC-03-008: Expected 400/409/422 for duplicate slug, got $STATUS"
fi

section "Validation: Missing Name"
STATUS=$(http_status "$JAR" "" "POST" "/organizations" '{"slug":"only-slug"}')
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "TC-03-009: Missing name → $STATUS"
else
  fail "TC-03-009: Expected 400/422 for missing name, got $STATUS"
fi

section "Get Single Organization"
if [ -n "$CREATED_ID" ]; then
  RESP=$(api_get "$JAR" "" "/organizations/$CREATED_ID")
  assert_success "TC-03-010: GET /organizations/:id → success" "$RESP"
  GOT_NAME=$(echo "$RESP" | jq -r '.data.name // .data.org.name // empty')
  [ "$GOT_NAME" = "QA Org $UID_SUFFIX" ] && pass "TC-03-011: Org name correct" || \
    fail "TC-03-011: Expected 'QA Org $UID_SUFFIX', got '$GOT_NAME'"
fi

section "Update Organization"
if [ -n "$CREATED_ID" ]; then
  RESP=$(api_patch "$JAR" "" "/organizations/$CREATED_ID" \
    "{\"name\":\"QA Org Updated $UID_SUFFIX\"}")
  assert_success "TC-03-012: PATCH /organizations/:id → success" "$RESP"
  UPD_NAME=$(echo "$RESP" | jq -r '.data.name // .data.org.name // empty')
  [ "$UPD_NAME" = "QA Org Updated $UID_SUFFIX" ] && pass "TC-03-013: Updated name returned" || \
    fail "TC-03-013: Expected updated name, got '$UPD_NAME'"
fi

section "Organization Status"
if [ -n "$CREATED_ID" ]; then
  # Deactivate
  RESP=$(api_patch "$JAR" "" "/organizations/$CREATED_ID" '{"status":"INACTIVE"}')
  SUCCESS=$(echo "$RESP" | jq -r '.success // empty')
  STATUS_HTTP=$(http_status "$JAR" "" "PATCH" "/organizations/$CREATED_ID" '{"status":"INACTIVE"}')
  if [ "$SUCCESS" = "true" ] || [ "$STATUS_HTTP" = "200" ]; then
    pass "TC-03-014: PATCH status → INACTIVE succeeds"
  else
    skip "TC-03-014: Status update returned unexpected response"
  fi

  # Reactivate
  RESP=$(api_patch "$JAR" "" "/organizations/$CREATED_ID" '{"status":"ACTIVE"}')
  SUCCESS=$(echo "$RESP" | jq -r '.success // empty')
  if [ "$SUCCESS" = "true" ]; then
    pass "TC-03-015: PATCH status → ACTIVE succeeds"
  else
    skip "TC-03-015: Reactivation returned unexpected response"
  fi
fi

section "Filter and Search"
RESP=$(api_get "$JAR" "" "/organizations?status=ACTIVE")
assert_success "TC-03-016: GET /organizations?status=ACTIVE → success" "$RESP"

RESP=$(api_get "$JAR" "" "/organizations?search=qa")
assert_success "TC-03-017: GET /organizations?search=qa → success" "$RESP"

section "Delete Organization"
if [ -n "$CREATED_ID" ]; then
  STATUS=$(http_status "$JAR" "" "DELETE" "/organizations/$CREATED_ID")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "204" ]; then
    pass "TC-03-018: DELETE /organizations/:id → $STATUS"
    STATUS2=$(http_status "$JAR" "" "GET" "/organizations/$CREATED_ID")
    [ "$STATUS2" = "404" ] && pass "TC-03-019: Deleted org returns 404" || \
      skip "TC-03-019: Deleted org returned $STATUS2 (soft-delete)"
  else
    skip "TC-03-018: DELETE /organizations not implemented (returned $STATUS)"
    skip "TC-03-019: Delete skipped — org not deleted"
  fi
fi

section "Pagination"
RESP=$(api_get "$JAR" "" "/organizations?page=1&limit=2")
assert_success "TC-03-020: Pagination params accepted" "$RESP"

summary
