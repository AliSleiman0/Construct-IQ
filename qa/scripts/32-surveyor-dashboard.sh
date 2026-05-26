#!/usr/bin/env bash
# QA 32 — Surveyor: QS Dashboard (GET /dashboard/surveyor)
# Verifies the new cost-rollup endpoint: the SURVEYOR role can read it (needs the
# newly-granted read:dashboard perm), the payload shape is complete, the figures
# are internally consistent (variation/valuation status arrays, budget variance),
# and permission gating holds (CLIENT has no read:dashboard → 403).
# Requires `npm run seed` to have run AFTER read:dashboard was added to SURVEYOR.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 32 — Surveyor: QS Dashboard${NC}"

JARQ=$(make_jar)   # QS / SURVEYOR (manage:budget + read:dashboard) — org-wide cost view
JARC=$(make_jar)   # CLIENT — no dashboard/budget perms
cleanup() { cleanup_jar "$JARQ"; cleanup_jar "$JARC"; }
trap cleanup EXIT

# ── Logins ─────────────────────────────────────────────────────────────────────
section "Logins"
RESP=$(login "$JARQ" "qs@constructiq.com" "Demo@1234")
assert_field "TC-32-001: QS (SURVEYOR) login success" "$RESP" ".success" "true"
ORG_Q=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-32-002: organizationId present" "$ORG_Q"
HAS_DASH=$(echo "$RESP" | jq -r '.data.user.permissions | index("read:dashboard")')
assert_not_empty "TC-32-003: SURVEYOR now holds read:dashboard" "$HAS_DASH"

login "$JARC" "client@constructiq.com" "Demo@1234" > /dev/null

# ── QS can read the dashboard ───────────────────────────────────────────────────
section "QS dashboard read + shape"
ST=$(http_status "$JARQ" "$ORG_Q" GET "/dashboard/surveyor")
assert_status "TC-32-004: QS GET /dashboard/surveyor" "200" "$ST"

DASH=$(api_get "$JARQ" "$ORG_Q" "/dashboard/surveyor")
assert_success "TC-32-005: response envelope ok" "$DASH"

# All keys present (jq 'has' on each → must all be true).
for key in boqTotalValue boqItemCount pendingVariationCount pendingVariationImpact \
           awaitingCertificationCount certifiedValue budgetPlannedTotal \
           budgetActualSpend committedCost budgetVariancePct; do
  has=$(echo "$DASH" | jq -r ".data | has(\"$key\")")
  assert_field "TC-32-shape: payload has $key" "$DASH" ".data | has(\"$key\")" "true"
done

# Status arrays are fixed-order, length 3.
assert_field "TC-32-006: variationsByStatus has 3 buckets" "$DASH" ".data.variationsByStatus | length" "3"
assert_field "TC-32-007: variationsByStatus labels" "$DASH" \
  "[.data.variationsByStatus[].label] | join(\",\")" "Pending,Approved,Rejected"
assert_field "TC-32-008: valuationValueByStatus has 3 buckets" "$DASH" ".data.valuationValueByStatus | length" "3"
assert_field "TC-32-009: valuationValueByStatus labels" "$DASH" \
  "[.data.valuationValueByStatus[].label] | join(\",\")" "Draft,Submitted,Certified"

# ── Internal consistency ─────────────────────────────────────────────────────────
section "Internal consistency vs the list endpoints"
# awaitingCertificationValue == valuationValueByStatus[Submitted]
SUBMITTED=$(echo "$DASH" | jq -r '.data.valuationValueByStatus[] | select(.label=="Submitted") | .value')
AWAIT=$(echo "$DASH" | jq -r '.data.awaitingCertificationValue')
assert_field "TC-32-010: awaiting-cert value == submitted bucket" "$DASH" \
  ".data.awaitingCertificationValue" "$SUBMITTED"

# pendingVariationCount == variationsByStatus[Pending]
PVC=$(echo "$DASH" | jq -r '.data.variationsByStatus[] | select(.label=="Pending") | .value')
assert_field "TC-32-011: pendingVariationCount == pending bucket" "$DASH" \
  ".data.pendingVariationCount" "$PVC"

# BOQ total matches the /boq list sum (the dashboard must agree with the source list).
BOQ_SUM=$(api_get "$JARQ" "$ORG_Q" "/boq" | jq -r '[.data[].totalAmount] | add // 0 | floor')
DASH_BOQ=$(echo "$DASH" | jq -r '.data.boqTotalValue | floor')
assert_field "TC-32-012: dashboard BOQ total == /boq list sum" "{\"v\":\"$DASH_BOQ\"}" ".v" "$BOQ_SUM"

# budgetVariancePct == (planned - actual)/planned*100 (rounded for comparison).
EXPECT_PCT=$(echo "$DASH" | jq -r '(if .data.budgetPlannedTotal>0 then (.data.budgetPlannedTotal-.data.budgetActualSpend)/.data.budgetPlannedTotal*100 else 0 end) | floor')
GOT_PCT=$(echo "$DASH" | jq -r '.data.budgetVariancePct | floor')
assert_field "TC-32-013: budgetVariancePct formula holds" "{\"v\":\"$GOT_PCT\"}" ".v" "$EXPECT_PCT"

# ── Permission gating ────────────────────────────────────────────────────────────
section "Permission gating"
ST=$(http_status "$JARC" "$ORG_Q" GET "/dashboard/surveyor")
assert_status "TC-32-014: CLIENT (no read:dashboard) → 403" "403" "$ST"

summary
