'use client';

import { PurchaseOrdersPanel } from '@/features/procurement/components/PurchaseOrdersPanel';

// FINANCE_VIEWER is read-only by definition — it holds `read:purchase_orders`
// and nothing else on this resource, so every write affordance stays off.
export default function FinanceOrdersPage() {
  return <PurchaseOrdersPanel canCreate={false} canApprove={false} canManage={false} />;
}
