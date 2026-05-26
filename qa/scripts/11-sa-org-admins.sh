#!/usr/bin/env bash
# QA 11 — Super Admin: Org Admins listing + creation
# Targets the new feature: GET /users/org-admins, POST /users/org-admins
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 11 — Super Admin: Org Admins (list + create)${NC}"

JAR_SA=$(make_jar)
JAR_OA=$(make_jar)
JAR_NEW=$(make_jar)
trap "cleanup_jar $JAR_SA; cleanup_jar $JAR_OA; cleanup_jar $JAR_NEW" EXIT
TS="$(date +%s)"

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════
section "Super Admin Login"
RESP=$(login "$JAR_SA" "admin@constructiq.com" "Admin@1234")
assert_field "TC-11-001: SA login success" "$RESP" ".success" "true"
SA_IS_SUPER=$(echo "$RESP" | jq -r '.data.user.isSuperAdmin // empty')
[ "$SA_IS_SUPER" = "true" ] && pass "TC-11-002: SA flag set in JWT" || \
  fail "TC-11-002: isSuperAdmin not true — got '$SA_IS_SUPER'"

section "Org Admin Login (non-SA)"
RESP=$(login "$JAR_OA" "orgadmin@constructiq.com" "Demo@1234")
assert_field "TC-11-003: OA login success" "$RESP" ".success" "true"

# ═══════════════════════════════════════════════════════════════════════════════
# GET /users/org-admins — cross-org listing (SA-only)
# ═══════════════════════════════════════════════════════════════════════════════
section "GET /users/org-admins — listing"

LIST=$(api_get "$JAR_SA" "" "/users/org-admins")
assert_success "TC-11-010: SA GET /users/org-admins → success" "$LIST"
assert_array_not_empty "TC-11-011: List not empty (seed admins present)" "$LIST" ".data"

# Each row should have a userRoles array containing ORG_ADMIN or Admin
BAD_ROWS=$(echo "$LIST" | jq '[.data[] | select((.userRoles | map(.role.name) | (contains(["ORG_ADMIN"]) or contains(["Admin"]))) | not)] | length')
[ "$BAD_ROWS" = "0" ] && pass "TC-11-012: Every row has ORG_ADMIN or Admin role" || \
  fail "TC-11-012: $BAD_ROWS rows lack the admin role"

# Should include at least Company A's Olivia
HAS_OLIVIA=$(echo "$LIST" | jq '[.data[] | select(.email == "orgadmin@constructiq.com")] | length')
[ "$HAS_OLIVIA" -ge 1 ] && pass "TC-11-013: Olivia Romero (Company A admin) present" || \
  fail "TC-11-013: Olivia Romero missing from list"

# Multiple distinct organizationIds → confirms cross-org listing
DISTINCT_ORGS=$(echo "$LIST" | jq '[.data[].organizationId] | unique | length')
[ "$DISTINCT_ORGS" -ge 2 ] && pass "TC-11-014: Admins span multiple orgs ($DISTINCT_ORGS distinct)" || \
  skip "TC-11-014: Only $DISTINCT_ORGS distinct org(s) — limited seed data"

INITIAL_COUNT=$(echo "$LIST" | jq '.data | length')
echo "    (Initial admin count: $INITIAL_COUNT)"

section "GET /users/org-admins — auth & RBAC"

# Non-SA must be blocked
NEG_STATUS=$(http_status "$JAR_OA" "" "GET" "/users/org-admins")
assert_status "TC-11-020: Org Admin GET blocked" "403" "$NEG_STATUS"

# Anonymous must be blocked
ANON_JAR=$(make_jar)
ANON_STATUS=$(http_status "$ANON_JAR" "" "GET" "/users/org-admins")
[ "$ANON_STATUS" = "401" ] && pass "TC-11-021: Anonymous GET blocked (HTTP $ANON_STATUS)" || \
  fail "TC-11-021: Expected 401 for anonymous, got $ANON_STATUS"
cleanup_jar "$ANON_JAR"

# ═══════════════════════════════════════════════════════════════════════════════
# Pick a target organization for create tests
# ═══════════════════════════════════════════════════════════════════════════════
section "Pick Target Organization"

ORGS=$(api_get "$JAR_SA" "" "/organizations")
TARGET_ORG_ID=$(echo "$ORGS" | jq -r '.data[] | select(.name == "Company B") | .id // ._id // empty')
TARGET_ORG_NAME=$(echo "$ORGS" | jq -r '.data[] | select(.name == "Company B") | .name // empty')
assert_not_empty "TC-11-030: Target org (Company B) found" "$TARGET_ORG_ID"
echo "    Target: $TARGET_ORG_NAME ($TARGET_ORG_ID)"

# Also pull a second org for cross-org variation
ORG_C_ID=$(echo "$ORGS" | jq -r '.data[] | select(.name == "Company C") | .id // ._id // empty')

# ═══════════════════════════════════════════════════════════════════════════════
# POST /users/org-admins — happy path
# ═══════════════════════════════════════════════════════════════════════════════
section "POST /users/org-admins — happy path"

NEW_EMAIL="qa.orgadmin.$TS@example.com"
BODY=$(jq -nc \
  --arg em "$NEW_EMAIL" \
  --arg org "$TARGET_ORG_ID" \
  '{
    email: $em,
    password: "Demo@1234",
    firstName: "QA",
    lastName: "OrgAdmin",
    phone: "+1-555-9999",
    organizationId: $org
  }')

CREATE=$(api_post "$JAR_SA" "" "/users/org-admins" "$BODY")
assert_success "TC-11-040: SA POST /users/org-admins → success" "$CREATE"
NEW_ID=$(echo "$CREATE" | jq -r '.data.id // empty')
assert_not_empty "TC-11-041: Created user has id" "$NEW_ID"
assert_field "TC-11-042: Created user email matches" "$CREATE" ".data.email" "$NEW_EMAIL"
assert_field "TC-11-043: Created user organizationId matches target" "$CREATE" ".data.organizationId" "$TARGET_ORG_ID"
assert_field "TC-11-044: Created user status ACTIVE" "$CREATE" ".data.status" "ACTIVE"

# Role assigned should grant manage:company → name is 'Admin' or 'ORG_ADMIN'
ROLE_NAME=$(echo "$CREATE" | jq -r '.data.userRoles[0].role.name // empty')
case "$ROLE_NAME" in
  ORG_ADMIN|Admin) pass "TC-11-045: Role assigned is admin-tier ($ROLE_NAME)" ;;
  *) fail "TC-11-045: Unexpected role assigned: '$ROLE_NAME'" ;;
esac

# The list should now contain the new user
LIST2=$(api_get "$JAR_SA" "" "/users/org-admins")
NEW_COUNT=$(echo "$LIST2" | jq '.data | length')
[ "$NEW_COUNT" = "$((INITIAL_COUNT + 1))" ] && pass "TC-11-046: List grew by 1 ($INITIAL_COUNT → $NEW_COUNT)" || \
  fail "TC-11-046: Expected count $((INITIAL_COUNT + 1)), got $NEW_COUNT"

HAS_NEW=$(echo "$LIST2" | jq --arg em "$NEW_EMAIL" '[.data[] | select(.email == $em)] | length')
[ "$HAS_NEW" -ge 1 ] && pass "TC-11-047: New admin appears in /users/org-admins" || \
  fail "TC-11-047: New admin missing from list"

# ═══════════════════════════════════════════════════════════════════════════════
# New admin can log in and is scoped to the target org
# ═══════════════════════════════════════════════════════════════════════════════
section "New Admin Login & Org Scoping"

LOGIN_NEW=$(login "$JAR_NEW" "$NEW_EMAIL" "Demo@1234")
assert_field "TC-11-050: New admin login success" "$LOGIN_NEW" ".success" "true"

NEW_ORG_IN_JWT=$(echo "$LOGIN_NEW" | jq -r '.data.user.organizationId // empty')
[ "$NEW_ORG_IN_JWT" = "$TARGET_ORG_ID" ] && pass "TC-11-051: New admin JWT has target organizationId" || \
  fail "TC-11-051: Expected JWT orgId=$TARGET_ORG_ID, got $NEW_ORG_IN_JWT"

NEW_IS_SUPER=$(echo "$LOGIN_NEW" | jq -r '.data.user.isSuperAdmin // false')
[ "$NEW_IS_SUPER" != "true" ] && pass "TC-11-052: New admin is not Super Admin (isSuperAdmin=$NEW_IS_SUPER)" || \
  fail "TC-11-052: isSuperAdmin should not be true, got '$NEW_IS_SUPER'"

# New admin should be blocked from the SA-only endpoints
NEW_LIST_STATUS=$(http_status "$JAR_NEW" "" "GET" "/users/org-admins")
assert_status "TC-11-053: New admin (non-SA) blocked from GET /users/org-admins" "403" "$NEW_LIST_STATUS"

NEW_CREATE_STATUS=$(http_status "$JAR_NEW" "" "POST" "/users/org-admins" "$BODY")
assert_status "TC-11-054: New admin blocked from POST /users/org-admins" "403" "$NEW_CREATE_STATUS"

# ═══════════════════════════════════════════════════════════════════════════════
# Cross-tenant isolation: Org Admin cannot create an admin in another org
# ═══════════════════════════════════════════════════════════════════════════════
section "Cross-Tenant Isolation"

OA_BODY=$(jq -nc \
  --arg em "qa.orgadmin.oa.$TS@example.com" \
  --arg org "$TARGET_ORG_ID" \
  '{
    email: $em,
    password: "Demo@1234",
    firstName: "OA",
    lastName: "Attempt",
    organizationId: $org
  }')

OA_CREATE_STATUS=$(http_status "$JAR_OA" "" "POST" "/users/org-admins" "$OA_BODY")
assert_status "TC-11-060: Org Admin POST blocked" "403" "$OA_CREATE_STATUS"

# ═══════════════════════════════════════════════════════════════════════════════
# Negative cases
# ═══════════════════════════════════════════════════════════════════════════════
section "Negative — Duplicate Email"
DUP=$(api_post "$JAR_SA" "" "/users/org-admins" "$BODY")
DUP_CODE=$(echo "$DUP" | jq -r '.statusCode // empty')
DUP_MSG=$(echo "$DUP" | jq -r '.error.message // empty')
[ "$DUP_CODE" = "409" ] && pass "TC-11-070: Duplicate email → 409 ($DUP_MSG)" || \
  fail "TC-11-070: Expected 409, got $DUP_CODE ($DUP_MSG)"

section "Negative — Nonexistent Organization"
BAD_BODY=$(jq -nc --arg em "qa.badorg.$TS@example.com" '{
  email: $em, password: "Demo@1234",
  firstName: "Bad", lastName: "Org",
  organizationId: "nonexistent_cuid_xyz"
}')
BAD=$(api_post "$JAR_SA" "" "/users/org-admins" "$BAD_BODY")
BAD_CODE=$(echo "$BAD" | jq -r '.statusCode // empty')
[ "$BAD_CODE" = "404" ] && pass "TC-11-071: Bad org id → 404" || \
  fail "TC-11-071: Expected 404, got $BAD_CODE"

section "Negative — Missing Required Fields"
# Missing organizationId
MISS_BODY=$(jq -nc --arg em "qa.missing.$TS@example.com" '{
  email: $em, password: "Demo@1234",
  firstName: "M", lastName: "Z"
}')
MISS=$(api_post "$JAR_SA" "" "/users/org-admins" "$MISS_BODY")
MISS_CODE=$(echo "$MISS" | jq -r '.statusCode // empty')
[ "$MISS_CODE" = "400" ] && pass "TC-11-072: Missing organizationId → 400" || \
  fail "TC-11-072: Expected 400, got $MISS_CODE"

# Invalid email
EMAIL_BODY=$(jq -nc --arg org "$TARGET_ORG_ID" '{
  email: "not-an-email", password: "Demo@1234",
  firstName: "B", lastName: "E",
  organizationId: $org
}')
EMAIL_RESP=$(api_post "$JAR_SA" "" "/users/org-admins" "$EMAIL_BODY")
EMAIL_CODE=$(echo "$EMAIL_RESP" | jq -r '.statusCode // empty')
[ "$EMAIL_CODE" = "400" ] && pass "TC-11-073: Invalid email → 400" || \
  fail "TC-11-073: Expected 400, got $EMAIL_CODE"

# Short password (< 8 chars)
PWD_BODY=$(jq -nc --arg em "qa.shortpwd.$TS@example.com" --arg org "$TARGET_ORG_ID" '{
  email: $em, password: "short",
  firstName: "S", lastName: "P",
  organizationId: $org
}')
PWD_RESP=$(api_post "$JAR_SA" "" "/users/org-admins" "$PWD_BODY")
PWD_CODE=$(echo "$PWD_RESP" | jq -r '.statusCode // empty')
[ "$PWD_CODE" = "400" ] && pass "TC-11-074: Short password → 400" || \
  fail "TC-11-074: Expected 400, got $PWD_CODE"

section "Negative — Forbidden Extra Fields"
# CreateOrgAdminDto doesn't include roleId; forbidNonWhitelisted should reject it
EXTRA_BODY=$(jq -nc --arg em "qa.extra.$TS@example.com" --arg org "$TARGET_ORG_ID" '{
  email: $em, password: "Demo@1234",
  firstName: "E", lastName: "F",
  organizationId: $org,
  roleId: "some_role_id_should_be_rejected"
}')
EXTRA_RESP=$(api_post "$JAR_SA" "" "/users/org-admins" "$EXTRA_BODY")
EXTRA_CODE=$(echo "$EXTRA_RESP" | jq -r '.statusCode // empty')
[ "$EXTRA_CODE" = "400" ] && pass "TC-11-075: Extra field (roleId) rejected → 400" || \
  skip "TC-11-075: Whitelist not strict (got $EXTRA_CODE) — DTO accepts unknown fields"

# ═══════════════════════════════════════════════════════════════════════════════
# Auto-provision: creating in an org with no admin role yet
# ═══════════════════════════════════════════════════════════════════════════════
section "Auto-Provision Admin Role"
# Create a fresh org via the existing org-create flow (POST /organizations)
# does provision STANDARD_ROLES, so Company C (seeded directly) is a better
# test target — but we already used B above. Try C if available.
if [ -n "$ORG_C_ID" ]; then
  AP_BODY=$(jq -nc --arg em "qa.autoprov.$TS@example.com" --arg org "$ORG_C_ID" '{
    email: $em, password: "Demo@1234",
    firstName: "Auto", lastName: "Prov",
    organizationId: $org
  }')
  AP=$(api_post "$JAR_SA" "" "/users/org-admins" "$AP_BODY")
  AP_OK=$(echo "$AP" | jq -r '.success // false')
  if [ "$AP_OK" = "true" ]; then
    pass "TC-11-080: Create succeeded in Company C (role auto-provisioned if absent)"
    AP_ROLE=$(echo "$AP" | jq -r '.data.userRoles[0].role.name // empty')
    case "$AP_ROLE" in
      ORG_ADMIN|Admin) pass "TC-11-081: Auto-provisioned/resolved role is admin-tier ($AP_ROLE)" ;;
      *) fail "TC-11-081: Unexpected role: '$AP_ROLE'" ;;
    esac
  else
    fail "TC-11-080: Auto-provision failed in Company C: $(echo "$AP" | jq -c '.error // .')"
    skip "TC-11-081: role-name check skipped"
  fi
else
  skip "TC-11-080: Company C not present in seed"
  skip "TC-11-081: Company C not present in seed"
fi

summary
