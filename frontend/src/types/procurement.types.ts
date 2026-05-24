export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DELIVERED'
  | 'CANCELLED';

export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  website?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  projectId: string;
  supplierId: string;
  budgetLineId?: string | null;
  poNumber: string;
  status: PurchaseOrderStatus;
  totalAmount?: number | null;
  currency: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  deliveryDate?: string | null;
  status: DeliveryStatus;
  receivedById?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  website?: string;
  notes?: string;
}

export interface CreatePurchaseOrderPayload {
  projectId: string;
  supplierId: string;
  poNumber: string;
  orderDate: string;
  status?: PurchaseOrderStatus;
  totalAmount?: number;
  currency?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items?: PurchaseOrderItem[];
}

export interface CreateDeliveryPayload {
  purchaseOrderId: string;
  deliveryDate?: string;
  status?: DeliveryStatus;
  notes?: string;
}

export interface UpdateDeliveryPayload {
  deliveryDate?: string;
  status?: DeliveryStatus;
  notes?: string;
}
