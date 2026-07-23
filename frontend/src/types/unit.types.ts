/**
 * Unit / payment / progress-photo types — mirrors the backend schemas in
 * `backend/src/modules/units/schemas/`. These replace the shapes that used to
 * live in `src/mocks/units.mock.ts` and `src/mocks/payments.mock.ts`.
 *
 * Note the enums are the *backend* ones, which differ from the old mock values:
 * `UnitType` is APARTMENT/VILLA/… rather than 1BR/2BR/…, and there is no `DUE`
 * payment status — an unpaid installment is PENDING until its due date passes,
 * at which point the backend reports OVERDUE.
 */

export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export type UnitType = 'APARTMENT' | 'VILLA' | 'STUDIO' | 'PENTHOUSE' | 'COMMERCIAL';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Unit {
  id: string;
  organizationId: string;
  projectId: string;
  label: string;
  floor: number;
  position: string | null;
  type: UnitType;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number;
  priceUsd: number;
  status: UnitStatus;
  buyerId: string | null;
  imageUrl: string | null;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  unitId: string;
  buyerId: string;
  installmentNo: number;
  totalInstallments: number;
  label: string;
  amountUsd: number;
  paidAmountUsd: number;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
  invoiceNumber: string | null;
}

export interface ProgressPhoto {
  id: string;
  organizationId: string;
  projectId: string;
  milestoneId: string | null;
  url: string;
  caption: string | null;
  takenAt: string;
  uploadedById: string | null;
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  STUDIO: 'Studio',
  PENTHOUSE: 'Penthouse',
  COMMERCIAL: 'Commercial',
};

export const UNIT_TYPES: UnitType[] = [
  'APARTMENT',
  'VILLA',
  'STUDIO',
  'PENTHOUSE',
  'COMMERCIAL',
];
