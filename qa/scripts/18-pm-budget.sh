#!/usr/bin/env bash
# QA 18 — PM: Budget (Phase 5 — backend exists, FE just wired)
# Budget is a SURVEYOR-owned resource: read:budget (PM) vs manage:budget (QS).
# Verifies the exact shape the BudgetPanel consumes (lines[].spentAmount + totalSpent),
# the spend math, the create/line/expense flow, the 409 dup guard, and PM read-only gating.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 18 — PM: Budget${NC}"

JAR=$(make_jar)    # PM (read:budget, manage:projects) — creates the scratch project
JARQ=$(make_jar)   # QS / SURVEYOR (manage:budget) — owns the budget
PID=""

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_ID:-}" ]; then
    api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARQ"
}
trap cleanup EXIT

# ── Logins + scratch project ────────────────────────────────────────────────────
section "Logins + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-18-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-18-002: organizationId present" "$ORG_ID"

RESP=$(login "$JARQ" "qs@constructiq.com" "Demo@1234")
assert_field "TC-18-003: QS (SURVEYOR) login success" "$RESP" ".success" "true"
ORG_Q=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')

RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA18 Budget $(date +%s)\",\"code\":\"QA18\",\"status\":\"ACTIVE\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-18-004: scratch projectId present" "$PID"

# ── No budget yet → 404 ──────────────────────────────────────────────────────
section "No budget yet"
CODE=$(http_status "$JARQ" "$ORG_Q" GET "/budget?projectId=$PID")
assert_status "TC-18-010: GET budget before create → 404" "404" "$CODE"

# ── PM read-only gating ──────────────────────────────────────────────────────
section "PM read-only gating"
CODE=$(http_status "$JAR" "$ORG_ID" POST "/budget" "{\"projectId\":\"$PID\",\"totalAmount\":1000}")
assert_status "TC-18-011: PM create budget → 403 (read-only)" "403" "$CODE"

# ── QS creates + reads the budget ────────────────────────────────────────────
section "Create + read"
RESP=$(api_post "$JARQ" "$ORG_Q" "/budget" "{\"projectId\":\"$PID\",\"totalAmount\":1000000,\"currency\":\"USD\"}")
assert_field "TC-18-020: QS create budget → success" "$RESP" ".success" "true"
BID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-18-021: budgetId present" "$BID"
# Duplicate create → 409.
CODE=$(http_status "$JARQ" "$ORG_Q" POST "/budget" "{\"projectId\":\"$PID\",\"totalAmount\":5}")
assert_status "TC-18-022: duplicate budget → 409" "409" "$CODE"

RESP=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID")
assert_success "TC-18-023: GET budget → success" "$RESP"
echo "$RESP" | jq -e '.data | has("lines") and (.lines|type=="array") and has("totalSpent")' >/dev/null \
  && pass "TC-18-024: budget carries lines[] + totalSpent" \
  || fail "TC-18-024: budget missing lines/totalSpent"

# ── Lines + expenses + spend math ────────────────────────────────────────────
section "Lines + expenses"
RESP=$(api_post "$JARQ" "$ORG_Q" "/budget/$BID/lines" "{\"category\":\"Concrete\",\"plannedAmount\":400000}")
assert_field "TC-18-030: add line → success" "$RESP" ".success" "true"
LID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-18-031: lineId present" "$LID"

RESP=$(api_post "$JARQ" "$ORG_Q" "/budget/$BID/expenses" "{\"description\":\"Cement delivery\",\"amount\":150000,\"date\":\"2026-05-10\",\"budgetLineId\":\"$LID\"}")
assert_field "TC-18-032: add expense → success" "$RESP" ".success" "true"

RESP=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID")
SPENT=$(echo "$RESP" | jq -r '.data.totalSpent')
LSPENT=$(echo "$RESP" | jq -r --arg l "$LID" '.data.lines[] | select(.id == $l or ._id == $l) | .spentAmount')
[ "$SPENT" = "150000" ] && pass "TC-18-033: totalSpent == 150000" || fail "TC-18-033: totalSpent expected 150000, got '$SPENT'"
[ "$LSPENT" = "150000" ] && pass "TC-18-034: line spentAmount == 150000" || fail "TC-18-034: line spentAmount expected 150000, got '$LSPENT'"

# ── Expense history (list + delete) ──────────────────────────────────────────
section "Expense history"
# Second expense so list has > 1 and we can verify spend drops on delete.
RESP=$(api_post "$JARQ" "$ORG_Q" "/budget/$BID/expenses" "{\"description\":\"Rebar\",\"amount\":50000,\"date\":\"2026-05-12\",\"budgetLineId\":\"$LID\"}")
EID2=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-18-035: second expense id present" "$EID2"

RESP=$(api_get "$JARQ" "$ORG_Q" "/budget/$BID/expenses")
LEN=$(echo "$RESP" | jq -r '.data | length')
[ "$LEN" = "2" ] && pass "TC-18-036: GET expenses returns 2" || fail "TC-18-036: expected 2 expenses, got '$LEN'"
echo "$RESP" | jq -e '.data[0] | has("description") and has("amount") and has("date")' >/dev/null \
  && pass "TC-18-037: expense rows carry description/amount/date" \
  || fail "TC-18-037: expense rows missing fields"
SPENT=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID" | jq -r '.data.totalSpent')
[ "$SPENT" = "200000" ] && pass "TC-18-038: totalSpent reflects both (200000)" || fail "TC-18-038: expected 200000, got '$SPENT'"

# PM cannot delete an expense (read-only).
CODE=$(http_status "$JAR" "$ORG_ID" DELETE "/budget/$BID/expenses/$EID2")
assert_status "TC-18-039: PM delete expense → 403" "403" "$CODE"

# QS deletes the second expense → list drops to 1 and spend recomputes.
CODE=$(http_status "$JARQ" "$ORG_Q" DELETE "/budget/$BID/expenses/$EID2")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } && pass "TC-18-045: delete expense → $CODE" || fail "TC-18-045: delete expense got $CODE"
LEN=$(api_get "$JARQ" "$ORG_Q" "/budget/$BID/expenses" | jq -r '.data | length')
[ "$LEN" = "1" ] && pass "TC-18-046: expense list now 1" || fail "TC-18-046: expected 1 expense, got '$LEN'"
SPENT=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID" | jq -r '.data.totalSpent')
[ "$SPENT" = "150000" ] && pass "TC-18-047: totalSpent dropped to 150000 after delete" || fail "TC-18-047: expected 150000, got '$SPENT'"
# Deleting a non-existent expense → 404.
CODE=$(http_status "$JARQ" "$ORG_Q" DELETE "/budget/$BID/expenses/nope-no-such-id")
assert_status "TC-18-048: delete missing expense → 404" "404" "$CODE"

# ── Edit expense (re-point line + change amount) ─────────────────────────────
section "Edit expense"
# Add an UNASSIGNED expense (no budgetLineId), then PATCH it onto the line + new amount.
RESP=$(api_post "$JARQ" "$ORG_Q" "/budget/$BID/expenses" '{"description":"Misc","amount":10000,"date":"2026-05-20"}')
EID3=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-18-049: unassigned expense id" "$EID3"
RESP=$(api_patch "$JARQ" "$ORG_Q" "/budget/$BID/expenses/$EID3" "{\"amount\":30000,\"budgetLineId\":\"$LID\"}")
assert_field "TC-18-050: PATCH expense amount → 30000" "$RESP" ".data.amount" "30000"
assert_field "TC-18-051: PATCH expense re-pointed to line" "$RESP" ".data.budgetLineId" "$LID"
# The line's spentAmount now reflects 150000 (original) + 30000 = 180000.
LSPENT=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID" | jq -r --arg l "$LID" '.data.lines[] | select(.id==$l or ._id==$l) | .spentAmount')
[ "$LSPENT" = "180000" ] && pass "TC-18-052: line spentAmount reflects edited expense (180000)" || fail "TC-18-052: expected 180000, got '$LSPENT'"
# Clearing the line ('' → null) un-assigns it; line spend drops back to 150000.
RESP=$(api_patch "$JARQ" "$ORG_Q" "/budget/$BID/expenses/$EID3" '{"budgetLineId":""}')
echo "$RESP" | jq -e '.data.budgetLineId == null' >/dev/null \
  && pass "TC-18-053: empty budgetLineId clears attribution" || fail "TC-18-053: line not cleared"
# PM cannot edit an expense (read-only).
CODE=$(http_status "$JAR" "$ORG_ID" PATCH "/budget/$BID/expenses/$EID3" '{"amount":1}')
assert_status "TC-18-054: PM edit expense → 403" "403" "$CODE"
# Editing a non-existent expense → 404.
CODE=$(http_status "$JARQ" "$ORG_Q" PATCH "/budget/$BID/expenses/nope-no-such-id" '{"amount":1}')
assert_status "TC-18-055: edit missing expense → 404" "404" "$CODE"

# ── Update budget total ──────────────────────────────────────────────────────
section "Update + delete line"
RESP=$(api_patch "$JARQ" "$ORG_Q" "/budget/$BID" '{"totalAmount":1250000}')
assert_field "TC-18-040: PATCH totalAmount → success" "$RESP" ".success" "true"
NEW=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID" | jq -r '.data.totalAmount')
[ "$NEW" = "1250000" ] && pass "TC-18-041: totalAmount persisted (1250000)" || fail "TC-18-041: got '$NEW'"

# PM cannot add a line (read-only).
CODE=$(http_status "$JAR" "$ORG_ID" POST "/budget/$BID/lines" '{"category":"x","plannedAmount":1}')
assert_status "TC-18-042: PM add line → 403" "403" "$CODE"

# Delete the line.
CODE=$(http_status "$JARQ" "$ORG_Q" DELETE "/budget/$BID/lines/$LID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } && pass "TC-18-043: delete line → $CODE" || fail "TC-18-043: delete line got $CODE"
LEN=$(api_get "$JARQ" "$ORG_Q" "/budget?projectId=$PID" | jq -r '.data.lines | length')
[ "$LEN" = "0" ] && pass "TC-18-044: line removed (0 lines)" || fail "TC-18-044: expected 0 lines, got '$LEN'"

summary
