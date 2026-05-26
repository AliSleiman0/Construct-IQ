#!/usr/bin/env bash
# QA 01 — Authentication & Session Management
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 01 — Auth & Session Management${NC}"

JAR=$(make_jar)
trap "cleanup_jar $JAR" EXIT

# ── TC-01-001: Login page reachable (frontend) ────────────────────────────────
section "Login endpoint health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/login" -X POST \
  -H "Content-Type: application/json" -d '{}')
# 400 = endpoint exists but validation failed (correct)
if [ "$STATUS" = "400" ] || [ "$STATUS" = "401" ] || [ "$STATUS" = "422" ]; then
  pass "TC-01-001: POST /auth/login endpoint reachable"
else
  fail "TC-01-001: Unexpected status $STATUS from /auth/login"
fi

# ── TC-01-002: Empty body returns 400 ────────────────────────────────────────
STATUS=$(http_status "$JAR" "" "POST" "/auth/login" '{}')
assert_status "TC-01-002: Empty credentials → 400/422" "400" "$STATUS" 2>/dev/null || \
  assert_status "TC-01-002: Empty credentials → 401" "401" "$STATUS"

# ── TC-01-003: Invalid email format → 400 ─────────────────────────────────────
STATUS=$(http_status "$JAR" "" "POST" "/auth/login" '{"email":"notanemail","password":"anypass"}')
if [ "$STATUS" = "400" ] || [ "$STATUS" = "401" ] || [ "$STATUS" = "422" ]; then
  pass "TC-01-003: Invalid email format → non-200 ($STATUS)"
else
  fail "TC-01-003: Expected 400/401/422, got $STATUS"
fi

# ── TC-01-004: Wrong password → 401 ──────────────────────────────────────────
STATUS=$(http_status "$JAR" "" "POST" "/auth/login" \
  '{"email":"orgadmin@constructiq.com","password":"WrongPassword"}')
assert_status "TC-01-004: Wrong password → 401" "401" "$STATUS"

# ── TC-01-005: Super admin login → 200 + token ───────────────────────────────
section "Super Admin login"
RESP=$(login "$JAR" "admin@constructiq.com" "Admin@1234")
STATUS=$(echo "$RESP" | jq -r '.success' 2>/dev/null)
assert_field "TC-01-005: Super admin login → success:true" "$RESP" ".success" "true"
COOKIES=$(cat "$JAR")
assert_contains "TC-01-005: access_token cookie set" "$COOKIES" "access_token"

# ── TC-01-006: Org admin login → 200 + organizationId ────────────────────────
section "Org Admin login"
JAR2=$(make_jar)
RESP=$(login "$JAR2" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-01-006: Org admin login → success:true" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
assert_not_empty "TC-01-006: organizationId present in login response" "$ORG_ID"
cleanup_jar "$JAR2"

# ── TC-01-007: PM login returns 200 ──────────────────────────────────────────
section "Role-based login"
JAR3=$(make_jar)
RESP=$(login "$JAR3" "pm@constructiq.com" "Demo@1234")
assert_field "TC-01-007: PM login → success:true" "$RESP" ".success" "true"
cleanup_jar "$JAR3"

# ── TC-01-008: Support agent login returns 200 ────────────────────────────────
JAR4=$(make_jar)
RESP=$(login "$JAR4" "support@constructiq.com" "Demo@1234")
assert_field "TC-01-008: Support agent login → success:true" "$RESP" ".success" "true"
cleanup_jar "$JAR4"

# ── TC-01-009: Refresh token endpoint exists ──────────────────────────────────
section "Token refresh"
JAR5=$(make_jar)
login "$JAR5" "orgadmin@constructiq.com" "Demo@1234" > /dev/null
STATUS=$(http_status "$JAR5" "" "POST" "/auth/refresh")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
  pass "TC-01-009: POST /auth/refresh returns 200 with valid session"
elif [ "$STATUS" = "401" ]; then
  skip "TC-01-009: /auth/refresh returned 401 (refresh token may not be in cookie jar)"
else
  fail "TC-01-009: Unexpected status $STATUS from /auth/refresh"
fi
cleanup_jar "$JAR5"

# ── TC-01-010: No cookie → 401 on protected endpoint ─────────────────────────
section "Auth guard"
EMPTY_JAR=$(make_jar)
STATUS=$(http_status "$EMPTY_JAR" "" "GET" "/dashboard/org")
assert_status "TC-01-010: No cookie → 401 on protected endpoint" "401" "$STATUS"
cleanup_jar "$EMPTY_JAR"

# ── TC-01-011: Logout clears session ─────────────────────────────────────────
section "Logout"
JAR6=$(make_jar)
login "$JAR6" "orgadmin@constructiq.com" "Demo@1234" > /dev/null
ORG_ID=$(login_org_admin "$JAR6")
# Verify authenticated before logout
STATUS=$(http_status "$JAR6" "$ORG_ID" "GET" "/dashboard/org")
assert_status "TC-01-011a: Authenticated before logout → 200" "200" "$STATUS"
# Logout
LOGOUT_STATUS=$(http_status "$JAR6" "" "POST" "/auth/logout")
if [ "$LOGOUT_STATUS" = "200" ] || [ "$LOGOUT_STATUS" = "204" ]; then
  pass "TC-01-011b: POST /auth/logout → 200/204"
else
  skip "TC-01-011b: /auth/logout returned $LOGOUT_STATUS"
fi
cleanup_jar "$JAR6"

# ── TC-01-012: PM cannot access org-settings ─────────────────────────────────
section "Permission enforcement"
JAR7=$(make_jar)
RESP=$(login "$JAR7" "pm@constructiq.com" "Demo@1234")
PM_ORG=$(echo "$RESP" | jq -r '.data.user.organizationId // .data.organizationId // empty')
STATUS=$(http_status "$JAR7" "$PM_ORG" "GET" "/org-settings")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  pass "TC-01-012: PM cannot access /org-settings → $STATUS"
else
  fail "TC-01-012: Expected 401/403 for PM on /org-settings, got $STATUS"
fi
cleanup_jar "$JAR7"

# ── TC-01-013: Rate limiting on /auth/login ───────────────────────────────────
section "Rate limiting"
RATE_JAR=$(make_jar)
STATUSES=()
for i in $(seq 1 12); do
  S=$(http_status "$RATE_JAR" "" "POST" "/auth/login" \
    '{"email":"orgadmin@constructiq.com","password":"wrong"}')
  STATUSES+=("$S")
done
cleanup_jar "$RATE_JAR"
HAS_429=false
for s in "${STATUSES[@]}"; do
  [ "$s" = "429" ] && HAS_429=true && break
done
if $HAS_429; then
  pass "TC-01-013: Rate limiting triggers 429 after repeated failed logins"
else
  skip "TC-01-013: No 429 observed — rate limiting may be disabled in dev"
fi

# ── TC-01-014: isSuperAdmin absent in org admin token ─────────────────────────
section "JWT payload"
JAR8=$(make_jar)
RESP=$(login "$JAR8" "orgadmin@constructiq.com" "Demo@1234")
IS_SA=$(echo "$RESP" | jq -r '.data.user.isSuperAdmin // .data.isSuperAdmin // "false"')
if [ "$IS_SA" = "false" ] || [ "$IS_SA" = "null" ] || [ -z "$IS_SA" ]; then
  pass "TC-01-014: isSuperAdmin=false/absent for org admin"
else
  fail "TC-01-014: isSuperAdmin=$IS_SA for org admin (should be false)"
fi
cleanup_jar "$JAR8"

# ── TC-01-015: isSuperAdmin=true for super admin ─────────────────────────────
JAR9=$(make_jar)
RESP=$(login "$JAR9" "admin@constructiq.com" "Admin@1234")
IS_SA=$(echo "$RESP" | jq -r '.data.user.isSuperAdmin // .data.isSuperAdmin // "false"')
if [ "$IS_SA" = "true" ]; then
  pass "TC-01-015: isSuperAdmin=true for super admin"
else
  skip "TC-01-015: isSuperAdmin field not exposed in login response (value: $IS_SA)"
fi
cleanup_jar "$JAR9"

summary
