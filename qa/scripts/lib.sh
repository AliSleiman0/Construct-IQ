#!/usr/bin/env bash
# Shared helpers for ConstructIQ curl-based QA scripts

API="${API:-http://localhost:4000/api/v1}"
PASS=0
FAIL=0
SKIP=0

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✓ PASS${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}  ✗ FAIL${NC} $1"; FAIL=$((FAIL + 1)); }
skip() { echo -e "${YELLOW}  - SKIP${NC} $1"; SKIP=$((SKIP + 1)); }
section() { echo -e "\n${CYAN}── $1 ──${NC}"; }

summary() {
  echo ""
  echo "────────────────────────────────"
  echo -e "  ${GREEN}PASS${NC}: $PASS   ${RED}FAIL${NC}: $FAIL   ${YELLOW}SKIP${NC}: $SKIP"
  echo "────────────────────────────────"
  echo "QA_TOTALS PASS:$PASS FAIL:$FAIL SKIP:$SKIP"
  [ "$FAIL" -eq 0 ]
}

# ── HTTP helpers ──────────────────────────────────────────────────────────────
# Usage: api_post <cookie_jar> <org_id_or_empty> <path> <body_json>
api_post() {
  local jar="$1" org="$2" path="$3" body="$4"
  local headers=(-H "Content-Type: application/json")
  [ -n "$org" ] && headers+=(-H "X-Organization-Id: $org")
  curl -s -b "$jar" -c "$jar" -X POST "$API$path" "${headers[@]}" -d "$body"
}

# Usage: api_get <cookie_jar> <org_id_or_empty> <path>
api_get() {
  local jar="$1" org="$2" path="$3"
  local headers=()
  [ -n "$org" ] && headers+=(-H "X-Organization-Id: $org")
  curl -s -b "$jar" "${headers[@]}" "$API$path"
}

# Usage: api_patch <cookie_jar> <org_id_or_empty> <path> <body_json>
api_patch() {
  local jar="$1" org="$2" path="$3" body="$4"
  local headers=(-H "Content-Type: application/json")
  [ -n "$org" ] && headers+=(-H "X-Organization-Id: $org")
  curl -s -b "$jar" -c "$jar" -X PATCH "$API$path" "${headers[@]}" -d "$body"
}

# Usage: api_delete <cookie_jar> <org_id_or_empty> <path>
api_delete() {
  local jar="$1" org="$2" path="$3"
  local headers=()
  [ -n "$org" ] && headers+=(-H "X-Organization-Id: $org")
  curl -s -b "$jar" -X DELETE "$API$path" "${headers[@]}"
}

# Usage: http_status <cookie_jar> <org_id_or_empty> <method> <path> [body]
http_status() {
  local jar="$1" org="$2" method="$3" path="$4" body="${5:-}"
  local headers=()
  [ -n "$org" ] && headers+=(-H "X-Organization-Id: $org")
  if [ -n "$body" ]; then
    headers+=(-H "Content-Type: application/json")
    curl -s -o /dev/null -w "%{http_code}" -b "$jar" -c "$jar" -X "$method" "$API$path" "${headers[@]}" -d "$body"
  else
    curl -s -o /dev/null -w "%{http_code}" -b "$jar" "${headers[@]}" -X "$method" "$API$path"
  fi
}

# ── Auth helpers ──────────────────────────────────────────────────────────────
# Returns response JSON; writes cookies to jar
login() {
  local jar="$1" email="$2" password="$3"
  curl -s -c "$jar" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}"
}

# Login and extract organizationId from profile
login_org_admin() {
  local jar="$1"
  local resp
  resp=$(login "$jar" "orgadmin@constructiq.com" "Demo@1234")
  echo "$resp" | jq -r '.data.user.organizationId // .data.organizationId // empty' 2>/dev/null
}

login_super_admin() {
  local jar="$1"
  login "$jar" "admin@constructiq.com" "Admin@1234" > /dev/null
}

# Get org ID for super admin tests (fetch first org from list)
# NOTE: Organizations return 'id' field (not '_id') from the service layer
get_first_org_id() {
  local jar="$1"
  local resp
  resp=$(api_get "$jar" "" "/organizations?limit=1")
  echo "$resp" | jq -r '.data[0]._id // .data[0].id // .data.items[0]._id // empty' 2>/dev/null
}

# ── Assertion helpers ─────────────────────────────────────────────────────────
assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$label (HTTP $actual)"
  else
    fail "$label — expected HTTP $expected, got $actual"
  fi
}

assert_success() {
  local label="$1" json="$2"
  local ok
  ok=$(echo "$json" | jq -r '.success' 2>/dev/null)
  if [ "$ok" = "true" ]; then
    pass "$label"
  else
    fail "$label — .success not true in: $(echo "$json" | head -c 120)"
  fi
}

assert_field() {
  local label="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | jq -r "$field" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    pass "$label (.${field}=${expected})"
  else
    fail "$label — expected ${field}=${expected}, got ${actual}"
  fi
}

assert_not_empty() {
  local label="$1" value="$2"
  if [ -n "$value" ] && [ "$value" != "null" ] && [ "$value" != "undefined" ]; then
    pass "$label"
  else
    fail "$label — value is empty/null"
  fi
}

assert_array_not_empty() {
  local label="$1" json="$2" field="${3:-.data}"
  local len
  len=$(echo "$json" | jq "$field | length" 2>/dev/null)
  if [ -n "$len" ] && [ "$len" -gt 0 ] 2>/dev/null; then
    pass "$label (${len} items)"
  else
    fail "$label — array is empty or missing: $(echo "$json" | head -c 120)"
  fi
}

assert_contains() {
  local label="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    pass "$label"
  else
    fail "$label — '${needle}' not found in response"
  fi
}

assert_not_contains() {
  local label="$1" haystack="$2" needle="$3"
  if ! echo "$haystack" | grep -q "$needle"; then
    pass "$label"
  else
    fail "$label — '${needle}' unexpectedly found in response"
  fi
}

# ── Temp file helpers ─────────────────────────────────────────────────────────
make_jar() { mktemp /tmp/qa_cookies_XXXXXX.txt; }
cleanup_jar() { rm -f "$1"; }
