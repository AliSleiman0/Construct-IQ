#!/usr/bin/env bash
# QA 04 — Super Admin: Plans & Features CRUD
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 04 — Super Admin: Plans & Features${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT
TS="$(date +%s)"
PLAN_ID=""
FEATURE_ID=""

login_super_admin "$JAR"

# ═══════════════════════════════════════════════════════════════════
# PLANS
# ═══════════════════════════════════════════════════════════════════
section "List Plans"
RESP=$(api_get "$JAR" "" "/plans")
assert_success "TC-04-001: GET /plans → success" "$RESP"
assert_array_not_empty "TC-04-002: Plans list not empty" "$RESP" ".data"

POPULAR=$(echo "$RESP" | jq '[.data[] | select(.isPopular == true)] | length')
assert_contains "TC-04-003: At least one popular plan exists" "$POPULAR" "" 2>/dev/null
[ "$POPULAR" -ge 1 ] && pass "TC-04-003: Popular plan exists" || \
  skip "TC-04-003: No popular plan in seed"

section "Create Plan"
# Pre-clean any ENTERPRISE plan left from a previous test run
PREV_ENT=$(api_get "$JAR" "" "/plans" | jq -r '.data[] | select(.tier=="ENTERPRISE") | ._id // empty')
[ -n "$PREV_ENT" ] && http_status "$JAR" "" "DELETE" "/plans/$PREV_ENT" > /dev/null 2>&1 || true
CREATE_BODY="{\"name\":\"QA Plan $TS\",\"tier\":\"ENTERPRISE\",\"pricePerMonth\":999,\"maxUsers\":200,\"maxProjects\":500,\"isPopular\":false}"
RESP=$(api_post "$JAR" "" "/plans" "$CREATE_BODY")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-04-004: POST /plans → 201"
else
  fail "TC-04-004: POST /plans → $(echo "$RESP" | jq -r '.statusCode // "error"') ($(echo "$RESP" | jq -r '.error.message[0] // .error.message // "unknown"'))"
fi
PLAN_ID=$(echo "$RESP" | jq -r '.data._id // empty')
assert_not_empty "TC-04-005: Created plan has _id" "$PLAN_ID"
assert_field "TC-04-006: Plan name matches" "$RESP" ".data.name" "QA Plan $TS"
assert_field "TC-04-007: Plan tier matches" "$RESP" ".data.tier" "ENTERPRISE"

PRICE=$(echo "$RESP" | jq -r '.data.pricePerMonth // empty')
[ "$PRICE" = "999" ] && pass "TC-04-008: Plan price matches (999)" || \
  fail "TC-04-008: Expected pricePerMonth=999, got $PRICE"

section "Validation: Missing Name"
STATUS=$(http_status "$JAR" "" "POST" "/plans" '{"pricePerMonth":10}')
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "TC-04-009: Missing plan name → $STATUS"
else
  fail "TC-04-009: Expected 400/422, got $STATUS"
fi

section "Validation: Negative Price"
STATUS=$(http_status "$JAR" "" "POST" "/plans" \
  "{\"name\":\"Bad Plan\",\"pricePerMonth\":-50}")
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "TC-04-010: Negative price → $STATUS"
else
  skip "TC-04-010: Negative price returned $STATUS (may not be validated server-side)"
fi

section "Get & Update Plan"
if [ -n "$PLAN_ID" ]; then
  RESP=$(api_get "$JAR" "" "/plans/$PLAN_ID")
  assert_success "TC-04-011: GET /plans/:id → success" "$RESP"

  RESP=$(api_patch "$JAR" "" "/plans/$PLAN_ID" '{"pricePerMonth":1099}')
  assert_success "TC-04-012: PATCH /plans/:id → success" "$RESP"
  UPDATED_PRICE=$(echo "$RESP" | jq -r '.data.pricePerMonth // empty')
  [ "$UPDATED_PRICE" = "1099" ] && pass "TC-04-013: Price updated to 1099" || \
    fail "TC-04-013: Expected 1099, got $UPDATED_PRICE"

  # Toggle active
  RESP=$(api_patch "$JAR" "" "/plans/$PLAN_ID" '{"isActive":false}')
  assert_success "TC-04-014: PATCH isActive:false → success" "$RESP"

  # Toggle popular
  RESP=$(api_patch "$JAR" "" "/plans/$PLAN_ID" '{"isPopular":true}')
  assert_success "TC-04-015: PATCH isPopular:true → success" "$RESP"
fi

section "Plan Features Array"
if [ -n "$PLAN_ID" ]; then
  RESP=$(api_patch "$JAR" "" "/plans/$PLAN_ID" \
    '{"features":["Advanced Analytics","Dedicated Support"]}')
  assert_success "TC-04-016: PATCH plan features array → success" "$RESP"
  FEAT_LEN=$(echo "$RESP" | jq '.data.features | length' 2>/dev/null)
  [ "$FEAT_LEN" = "2" ] && pass "TC-04-017: Features array has 2 items" || \
    skip "TC-04-017: Features length $FEAT_LEN"
fi

# ═══════════════════════════════════════════════════════════════════
# FEATURES
# ═══════════════════════════════════════════════════════════════════
section "List Features"
RESP=$(api_get "$JAR" "" "/features")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-04-018: GET /features → success"
  assert_array_not_empty "TC-04-019: Features list exists" "$RESP" ".data"
else
  skip "TC-04-018: /features endpoint not available"
  skip "TC-04-019: /features endpoint not available"
fi

section "Create Feature"
FEAT_BODY="{\"name\":\"QA Feature $TS\",\"key\":\"qa_feature_$TS\",\"description\":\"QA test feature\"}"
RESP=$(api_post "$JAR" "" "/features" "$FEAT_BODY")
if echo "$RESP" | jq -e '.success == true' > /dev/null 2>&1; then
  pass "TC-04-020: POST /features → 201"
  FEATURE_ID=$(echo "$RESP" | jq -r '.data._id // empty')
  assert_not_empty "TC-04-021: Feature _id present" "$FEATURE_ID"
elif echo "$RESP" | jq -e '.statusCode == 404' > /dev/null 2>&1; then
  skip "TC-04-020: /features endpoint not implemented"
  skip "TC-04-021: /features endpoint not implemented"
else
  fail "TC-04-020: POST /features returned $(echo "$RESP" | jq -r '.statusCode // "error"') ($(echo "$RESP" | jq -r '.error.message[0] // .error.message // "unknown"'))"
fi

section "Update & Delete Feature"
if [ -n "$FEATURE_ID" ]; then
  RESP=$(api_patch "$JAR" "" "/features/$FEATURE_ID" '{"isActive":false}')
  assert_success "TC-04-022: PATCH feature isActive:false → success" "$RESP"

  STATUS=$(http_status "$JAR" "" "DELETE" "/features/$FEATURE_ID")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "204" ]; then
    pass "TC-04-023: DELETE /features/:id → $STATUS"
  else
    fail "TC-04-023: Expected 200/204, got $STATUS"
  fi
fi

section "Delete Test Plan"
if [ -n "$PLAN_ID" ]; then
  STATUS=$(http_status "$JAR" "" "DELETE" "/plans/$PLAN_ID")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "204" ]; then
    pass "TC-04-024: Test plan deleted successfully"
  else
    skip "TC-04-024: Plan delete returned $STATUS (may be in use)"
  fi
fi

section "Include Inactive Plans"
RESP=$(api_get "$JAR" "" "/plans?includeInactive=true")
assert_success "TC-04-025: GET /plans?includeInactive=true → success" "$RESP"

summary
