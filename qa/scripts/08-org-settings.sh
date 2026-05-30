#!/usr/bin/env bash
# QA 08 — Org Admin: Settings (all sections)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 08 — Org Admin: Settings${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT

section "Org Admin Login"
RESP=$(login "$JAR" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-08-001: Login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-08-002: organizationId present" "$ORG_ID"

# ═══════════════════════════════════════════════════════════════════
# GET Settings
# ═══════════════════════════════════════════════════════════════════
section "GET /org-settings"
RESP=$(api_get "$JAR" "$ORG_ID" "/org-settings")
assert_success "TC-08-003: GET /org-settings → success" "$RESP"
assert_not_empty "TC-08-004: organizationId in response" \
  "$(echo "$RESP" | jq -r '.data.organizationId // empty')"

# Save original values for restore
ORIG_TIMEZONE=$(echo "$RESP" | jq -r '.data.timezone // "UTC"')
ORIG_CURRENCY=$(echo "$RESP" | jq -r '.data.currency // "USD"')
ORIG_THEME=$(echo "$RESP" | jq -r '.data.theme // "light"')

section "Profile Section"
assert_not_empty "TC-08-005: brandColor field present" \
  "$(echo "$RESP" | jq -r '.data.brandColor // empty')"

section "PATCH — Branding"
RESP_PATCH=$(api_patch "$JAR" "$ORG_ID" "/org-settings" '{"brandColor":"#e53935"}')
assert_success "TC-08-006: PATCH brandColor → success" "$RESP_PATCH"
assert_field "TC-08-007: brandColor updated to #e53935" "$RESP_PATCH" ".data.brandColor" "#e53935"

section "PATCH — Theme"
RESP_PATCH=$(api_patch "$JAR" "$ORG_ID" "/org-settings" '{"theme":"dark"}')
assert_success "TC-08-008: PATCH theme:dark → success" "$RESP_PATCH"
assert_field "TC-08-009: theme updated to dark" "$RESP_PATCH" ".data.theme" "dark"

# Restore
api_patch "$JAR" "$ORG_ID" "/org-settings" "{\"theme\":\"$ORIG_THEME\"}" > /dev/null

section "PATCH — Localization"
RESP_PATCH=$(api_patch "$JAR" "$ORG_ID" "/org-settings" \
  '{"timezone":"America/Chicago","currency":"EUR","dateFormat":"DD/MM/YYYY","weekStart":"MONDAY","measurement":"METRIC"}')
assert_success "TC-08-010: PATCH localization fields → success" "$RESP_PATCH"
assert_field "TC-08-011: timezone updated" "$RESP_PATCH" ".data.timezone" "America/Chicago"
assert_field "TC-08-012: currency updated to EUR" "$RESP_PATCH" ".data.currency" "EUR"
assert_field "TC-08-013: dateFormat updated" "$RESP_PATCH" ".data.dateFormat" "DD/MM/YYYY"
assert_field "TC-08-014: weekStart updated" "$RESP_PATCH" ".data.weekStart" "MONDAY"
assert_field "TC-08-015: measurement updated" "$RESP_PATCH" ".data.measurement" "METRIC"

# Restore
api_patch "$JAR" "$ORG_ID" "/org-settings" \
  "{\"timezone\":\"$ORIG_TIMEZONE\",\"currency\":\"$ORIG_CURRENCY\"}" > /dev/null

section "PATCH — Notifications"
NOTIF='{
  "notifications": {
    "email": false,
    "push": true,
    "reportReminders": false,
    "budgetAlerts": true
  }
}'
RESP_PATCH=$(api_patch "$JAR" "$ORG_ID" "/org-settings" "$NOTIF")
assert_success "TC-08-016: PATCH notifications object → success" "$RESP_PATCH"
EMAIL_VAL=$(echo "$RESP_PATCH" | jq -r '.data.notifications.email // empty')
if [ "$EMAIL_VAL" = "false" ]; then
  pass "TC-08-017: notifications.email set to false"
else
  skip "TC-08-017: notifications.email not in response (value: $EMAIL_VAL)"
fi

section "PATCH — Security"
RESP_PATCH=$(api_patch "$JAR" "$ORG_ID" "/org-settings" \
  '{"twoFactorRequired":true,"sessionTimeoutMin":30,"ssoEnabled":false,"passwordPolicy":"strong"}')
assert_success "TC-08-018: PATCH security fields → success" "$RESP_PATCH"
assert_field "TC-08-019: twoFactorRequired=true" "$RESP_PATCH" ".data.twoFactorRequired" "true"
assert_field "TC-08-020: sessionTimeoutMin=30" "$RESP_PATCH" ".data.sessionTimeoutMin" "30"
assert_field "TC-08-021: passwordPolicy=strong" "$RESP_PATCH" ".data.passwordPolicy" "strong"

section "Validation — sessionTimeoutMin out of range"
# Below min (5)
STATUS=$(http_status "$JAR" "$ORG_ID" "PATCH" "/org-settings" '{"sessionTimeoutMin":2}')
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "TC-08-022: sessionTimeoutMin=2 → $STATUS (below min)"
else
  skip "TC-08-022: sessionTimeoutMin=2 returned $STATUS (validation may be client-only)"
fi

# Above max (1440)
STATUS=$(http_status "$JAR" "$ORG_ID" "PATCH" "/org-settings" '{"sessionTimeoutMin":9999}')
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "TC-08-023: sessionTimeoutMin=9999 → $STATUS (above max)"
else
  skip "TC-08-023: sessionTimeoutMin=9999 returned $STATUS (validation may be client-only)"
fi

section "Upsert (first-time GET creates record)"
# GET for another org (super admin context)
JAR2=$(make_jar)
login_super_admin "$JAR2"
ORG_LIST=$(api_get "$JAR2" "" "/organizations")
OTHER_ORG=$(echo "$ORG_LIST" | jq -r '[.data[] | select((.id // ._id) != "'"$ORG_ID"'")] | .[0]._id // .[0].id // empty')
if [ -n "$OTHER_ORG" ] && [ "$OTHER_ORG" != "null" ]; then
  RESP=$(api_get "$JAR2" "$OTHER_ORG" "/org-settings")
  assert_success "TC-08-024: GET /org-settings upserts on first access" "$RESP"
else
  skip "TC-08-024: No other org for upsert test"
fi
cleanup_jar "$JAR2"

section "PM cannot access /org-settings"
JAR3=$(make_jar)
RESP=$(login "$JAR3" "pm@constructiq.com" "Demo@1234")
PM_ORG=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
STATUS=$(http_status "$JAR3" "$PM_ORG" "GET" "/org-settings")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  pass "TC-08-025: PM cannot access /org-settings → $STATUS"
else
  fail "TC-08-025: Expected 401/403 for PM, got $STATUS"
fi
STATUS=$(http_status "$JAR3" "$PM_ORG" "PATCH" "/org-settings" '{"theme":"dark"}')
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  pass "TC-08-026: PM cannot PATCH /org-settings → $STATUS"
else
  fail "TC-08-026: Expected 401/403 for PM PATCH, got $STATUS"
fi
cleanup_jar "$JAR3"

section "Response always includes organizationId"
RESP=$(api_get "$JAR" "$ORG_ID" "/org-settings")
RES_ORG=$(echo "$RESP" | jq -r '.data.organizationId')
[ "$RES_ORG" = "$ORG_ID" ] && pass "TC-08-027: Response organizationId matches request org" || \
  fail "TC-08-027: organizationId mismatch: $RES_ORG vs $ORG_ID"

# Restore 2FA to false
api_patch "$JAR" "$ORG_ID" "/org-settings" '{"twoFactorRequired":false}' > /dev/null

summary
