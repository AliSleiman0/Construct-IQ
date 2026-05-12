export type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE';

interface Invoice {
  id: string;
  number: string;
  planName: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  amountUsd: number;
}

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv-1', number: 'INV-2026-006', planName: 'Professional', issuedAt: '2026-05-01', dueAt: '2026-05-15', status: 'DUE', amountUsd: 299 },
  { id: 'inv-2', number: 'INV-2026-005', planName: 'Professional', issuedAt: '2026-04-01', dueAt: '2026-04-15', status: 'OVERDUE', amountUsd: 299 },
  { id: 'inv-3', number: 'INV-2026-004', planName: 'Professional', issuedAt: '2026-03-01', dueAt: '2026-03-15', status: 'PAID', amountUsd: 299 },
  { id: 'inv-4', number: 'INV-2026-003', planName: 'Professional', issuedAt: '2026-02-01', dueAt: '2026-02-15', status: 'PAID', amountUsd: 299 },
  { id: 'inv-5', number: 'INV-2026-002', planName: 'Professional', issuedAt: '2026-01-01', dueAt: '2026-01-15', status: 'PAID', amountUsd: 299 },
  { id: 'inv-6', number: 'INV-2025-012', planName: 'Professional', issuedAt: '2025-12-01', dueAt: '2025-12-15', status: 'PAID', amountUsd: 299 },
];

export function invoicesForOrg(_orgId: string): Invoice[] {
  return MOCK_INVOICES;
}
