#!/usr/bin/env bash
# QA 27 — Site Engineer: deliveries receipt confirmation (SE-7)
# A SITE_ENG sees only deliveries for POs on their member projects (member-scoped
# via PO->project), each row is enriched with poNumber + projectId, and they can
# confirm goods-received (status->DELIVERED, receivedById=self) only on their own
# projects. PM creates projects + members; PROCUREMENT creates supplier/PO/delivery.
#
#   API=http://localhost:4001/api/v1 ./27-site-eng-deliveries.sh   # against a non-default port
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 27 — Site Engineer: deliveries receipt confirmation${NC}"

JAR=$(make_jar)     # PM (projects + members)
JARP=$(make_jar)    # PROCUREMENT (supplier/PO/delivery)
JARE=$(make_jar)    # engineer (SITE_ENG, member-scoped)
MPID=""; NPID=""; SID=""; MPO=""; NPO=""; MDEL=""; NDEL=""

cleanup() {
  if [ -n "${ORG_ID:-}" ]; then
    [ -n "$MPO" ] && api_delete "$JARP" "$ORG_ID" "/purchase-orders/$MPO" >/dev/null 2>&1 || true
    [ -n "$NPO" ] && api_delete "$JARP" "$ORG_ID" "/purchase-orders/$NPO" >/dev/null 2>&1 || true
    [ -n "$SID" ] && api_delete "$JARP" "$ORG_ID" "/suppliers/$SID" >/dev/null 2>&1 || true
    # deliveries have no delete endpoint — scratch deliveries persist
    [ -n "$MPID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$MPID" >/dev/null 2>&1 || true
    [ -n "$NPID" ] && api_delete "$JAR" "$ORG_ID" "/projects/$NPID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARP"; cleanup_jar "$JARE"
}
trap cleanup EXIT

TS=$(date +%s)

# ── Logins ──────────────────────────────────────────────────────────────────
section "Logins"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-27-001: PM login" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
assert_not_empty "TC-27-002: PM organizationId" "$ORG_ID"

RESP=$(login "$JARP" "procurement@constructiq.com" "Demo@1234")
assert_field "TC-27-003: PROCUREMENT login" "$RESP" ".success" "true"

RESP=$(login "$JARE" "engineer@constructiq.com" "Demo@1234")
assert_field "TC-27-004: engineer login" "$RESP" ".success" "true"
ENG_ID=$(echo "$RESP" | jq -r '.data.user.id // .data.user._id // empty')
assert_not_empty "TC-27-005: engineer userId" "$ENG_ID"
echo "$RESP" | jq -e '.data.user.permissions | index("confirm:deliveries")' >/dev/null \
  && pass "TC-27-006: engineer holds confirm:deliveries" \
  || fail "TC-27-006: confirm:deliveries missing — re-seed needed? perms: $(echo "$RESP" | jq -c '.data.user.permissions')"

# ── Projects: one the engineer is a member of, one they are NOT ──────────────
section "Projects (member + non-member)"
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA27 Member $TS\",\"code\":\"QA27M\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
MPID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-010: member projectId" "$MPID"
api_post "$JAR" "$ORG_ID" "/projects/$MPID/members" "{\"userId\":\"$ENG_ID\",\"role\":\"Site Engineer\"}" >/dev/null

RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA27 Other $TS\",\"code\":\"QA27O\",\"status\":\"ACTIVE\",\"startDate\":\"2026-03-01\",\"endDate\":\"2026-12-31\"}")
NPID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-011: non-member projectId" "$NPID"

# ── Supplier + POs + deliveries (as PROCUREMENT) ─────────────────────────────
section "Supplier + POs + deliveries"
RESP=$(api_post "$JARP" "$ORG_ID" "/suppliers" "{\"name\":\"QA27 Supplier $TS\"}")
SID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-020: supplierId" "$SID"

RESP=$(api_post "$JARP" "$ORG_ID" "/purchase-orders" "{\"projectId\":\"$MPID\",\"supplierId\":\"$SID\",\"poNumber\":\"QA27-M-$TS\",\"orderDate\":\"2026-05-01\"}")
MPO=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-021: member PO id" "$MPO"
RESP=$(api_post "$JARP" "$ORG_ID" "/purchase-orders" "{\"projectId\":\"$NPID\",\"supplierId\":\"$SID\",\"poNumber\":\"QA27-O-$TS\",\"orderDate\":\"2026-05-01\"}")
NPO=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-022: non-member PO id" "$NPO"

RESP=$(api_post "$JARP" "$ORG_ID" "/deliveries" "{\"purchaseOrderId\":\"$MPO\",\"status\":\"PENDING\"}")
MDEL=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-023: member delivery id" "$MDEL"
RESP=$(api_post "$JARP" "$ORG_ID" "/deliveries" "{\"purchaseOrderId\":\"$NPO\",\"status\":\"PENDING\"}")
NDEL=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-27-024: non-member delivery id" "$NDEL"

# ── Engineer list: member-scoped + PO-enriched ───────────────────────────────
section "Engineer list is member-scoped + PO-enriched"
RESP=$(api_get "$JARE" "$ORG_ID" "/deliveries")
assert_contains "TC-27-030: engineer sees their member-project delivery" "$RESP" "$MDEL"
assert_not_contains "TC-27-031: engineer does NOT see the non-member delivery" "$RESP" "$NDEL"
PONUM=$(echo "$RESP" | jq -r --arg id "$MDEL" '.data[] | select((.id//._id)==$id) | .poNumber')
assert_field "TC-27-032: delivery row is enriched with poNumber" "{\"n\":\"$PONUM\"}" ".n" "QA27-M-$TS"
PROJ=$(echo "$RESP" | jq -r --arg id "$MDEL" '.data[] | select((.id//._id)==$id) | .projectId')
assert_field "TC-27-033: delivery row is enriched with projectId" "{\"p\":\"$PROJ\"}" ".p" "$MPID"

# ── Confirm receipt (member project) ─────────────────────────────────────────
section "Confirm receipt"
RESP=$(api_post "$JARE" "$ORG_ID" "/deliveries/$MDEL/confirm" "{\"notes\":\"received on site\"}")
assert_field "TC-27-040: confirm sets status DELIVERED" "$RESP" ".data.status" "DELIVERED"
assert_field "TC-27-041: confirm records receivedById = engineer" "$RESP" ".data.receivedById" "$ENG_ID"
RDATE=$(echo "$RESP" | jq -r '.data.deliveryDate // empty')
assert_not_empty "TC-27-042: confirm defaults a deliveryDate" "$RDATE"

# ── Confirm on a non-member delivery is forbidden ────────────────────────────
section "Member-gate on confirm"
ST=$(http_status "$JARE" "$ORG_ID" "POST" "/deliveries/$NDEL/confirm" "{}")
assert_status "TC-27-050: engineer cannot confirm a non-member delivery" "403" "$ST"

# ── PROCUREMENT keeps the org-wide view (no member scoping) ──────────────────
section "Procurement stays org-wide"
RESP=$(api_get "$JARP" "$ORG_ID" "/deliveries")
assert_contains "TC-27-060: procurement sees the member delivery" "$RESP" "$MDEL"
assert_contains "TC-27-061: procurement sees the non-member delivery (org-wide)" "$RESP" "$NDEL"

summary
