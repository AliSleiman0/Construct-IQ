#!/usr/bin/env bash
# QA 19 — PM: Procurement (Suppliers / Purchase Orders / Deliveries — Phase 5)
# Procurement is PROCUREMENT-owned (manage); PM has read + approve:purchase_orders.
# Verifies CRUD, the PO approve gate (SUBMITTED→APPROVED only), dup poNumber 409,
# and PM read/approve vs manage gating.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/lib.sh"

echo -e "${CYAN}QA 19 — PM: Procurement${NC}"

JAR=$(make_jar)    # PM (read + approve:purchase_orders, manage:projects)
JARP=$(make_jar)   # PROCUREMENT (manage suppliers/POs/deliveries)
PID=""

cleanup() {
  if [ -n "$PID" ] && [ -n "${ORG_ID:-}" ]; then
    api_delete "$JAR" "$ORG_ID" "/projects/$PID" >/dev/null 2>&1 || true
  fi
  cleanup_jar "$JAR"; cleanup_jar "$JARP"
}
trap cleanup EXIT

# ── Logins + scratch project ────────────────────────────────────────────────────
section "Logins + scratch project"
RESP=$(login "$JAR" "pm@constructiq.com" "Demo@1234")
assert_field "TC-19-001: PM login success" "$RESP" ".success" "true"
ORG_ID=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
RESP=$(login "$JARP" "procurement@constructiq.com" "Demo@1234")
assert_field "TC-19-002: PROCUREMENT login success" "$RESP" ".success" "true"
ORG_P=$(echo "$RESP" | jq -r '.data.user.organizationId // empty')
RESP=$(api_post "$JAR" "$ORG_ID" "/projects" "{\"name\":\"QA19 Proc $(date +%s)\",\"code\":\"QA19\",\"status\":\"ACTIVE\"}")
PID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-19-003: scratch projectId present" "$PID"

# ── Suppliers ────────────────────────────────────────────────────────────────
section "Suppliers"
RESP=$(api_post "$JARP" "$ORG_P" "/suppliers" '{"name":"QA Cement Co","email":"sales@qacement.test","phone":"+1-555-0100"}')
assert_field "TC-19-010: PROC create supplier → success" "$RESP" ".success" "true"
SID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-19-011: supplierId present" "$SID"
# PM can read suppliers but not create.
RESP=$(api_get "$JAR" "$ORG_ID" "/suppliers")
assert_contains "TC-19-012: PM list includes the supplier" "$RESP" "$SID"
CODE=$(http_status "$JAR" "$ORG_ID" POST "/suppliers" '{"name":"PM Vendor"}')
assert_status "TC-19-013: PM create supplier → 403" "403" "$CODE"
RESP=$(api_patch "$JARP" "$ORG_P" "/suppliers/$SID" '{"contactName":"Jane Doe"}')
assert_field "TC-19-014: PROC update supplier → success" "$RESP" ".success" "true"

# ── Purchase Orders ──────────────────────────────────────────────────────────
section "Purchase Orders"
PONUM="PO-$(date +%s)"
RESP=$(api_post "$JARP" "$ORG_P" "/purchase-orders" "{\"projectId\":\"$PID\",\"supplierId\":\"$SID\",\"poNumber\":\"$PONUM\",\"orderDate\":\"2026-05-01\",\"status\":\"SUBMITTED\",\"totalAmount\":50000,\"items\":[{\"description\":\"Cement bags\",\"quantity\":100,\"unitPrice\":500,\"totalPrice\":50000}]}")
assert_field "TC-19-020: PROC create PO (SUBMITTED) → success" "$RESP" ".success" "true"
POID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-19-021: purchaseOrderId present" "$POID"
# Duplicate poNumber → 409.
CODE=$(http_status "$JARP" "$ORG_P" POST "/purchase-orders" "{\"projectId\":\"$PID\",\"supplierId\":\"$SID\",\"poNumber\":\"$PONUM\",\"orderDate\":\"2026-05-01\"}")
assert_status "TC-19-022: duplicate poNumber → 409" "409" "$CODE"
# PM cannot create a PO.
CODE=$(http_status "$JAR" "$ORG_ID" POST "/purchase-orders" "{\"projectId\":\"$PID\",\"supplierId\":\"$SID\",\"poNumber\":\"PM-$PONUM\",\"orderDate\":\"2026-05-01\"}")
assert_status "TC-19-023: PM create PO → 403" "403" "$CODE"
# PM approves the SUBMITTED PO (approve:purchase_orders).
RESP=$(api_post "$JAR" "$ORG_ID" "/purchase-orders/$POID/approve" '{}')
assert_field "TC-19-024: PM approve PO → APPROVED" "$RESP" ".data.status" "APPROVED"
# Approving again (now APPROVED, not SUBMITTED) → 400.
CODE=$(http_status "$JAR" "$ORG_ID" POST "/purchase-orders/$POID/approve" '{}')
assert_status "TC-19-025: re-approve non-SUBMITTED PO → 400" "400" "$CODE"

# ── Deliveries ───────────────────────────────────────────────────────────────
section "Deliveries"
RESP=$(api_post "$JARP" "$ORG_P" "/deliveries" "{\"purchaseOrderId\":\"$POID\",\"status\":\"PENDING\",\"deliveryDate\":\"2026-05-15\"}")
assert_field "TC-19-030: PROC create delivery → success" "$RESP" ".success" "true"
DID=$(echo "$RESP" | jq -r '.data.id // .data._id // empty')
assert_not_empty "TC-19-031: deliveryId present" "$DID"
# PM cannot create a delivery (no manage:deliveries).
CODE=$(http_status "$JAR" "$ORG_ID" POST "/deliveries" "{\"purchaseOrderId\":\"$POID\",\"status\":\"PENDING\"}")
assert_status "TC-19-032: PM create delivery → 403" "403" "$CODE"
# PROC updates the delivery status.
RESP=$(api_patch "$JARP" "$ORG_P" "/deliveries/$DID" '{"status":"IN_TRANSIT"}')
assert_field "TC-19-033: PROC update delivery → IN_TRANSIT" "$RESP" ".data.status" "IN_TRANSIT"

# ── Cleanup PO (manage) ──────────────────────────────────────────────────────
CODE=$(http_status "$JARP" "$ORG_P" DELETE "/purchase-orders/$POID")
{ [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; } && pass "TC-19-040: PROC delete PO → $CODE" || fail "TC-19-040: delete PO got $CODE"

summary
