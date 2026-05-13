export type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE';

export interface MockInvoice {
  id: string;
  number: string;
  orgId: string;
  orgName: string;
  planName: string;
  amountUsd: number;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
}

const ORGS = [
  { id: 'org-company-a', name: 'Company A', plan: 'Pro', amount: 349 },
  { id: 'org-company-b', name: 'Company B', plan: 'Starter', amount: 99 },
  { id: 'org-company-c', name: 'Company C', plan: 'Pro', amount: 349 },
];

const buildInvoices = (): MockInvoice[] => {
  const out: MockInvoice[] = [];
  // Last 6 months of invoices for each org
  for (let m = 0; m < 6; m += 1) {
    const issuedDate = new Date('2026-04-01T00:00:00.000Z');
    issuedDate.setUTCMonth(issuedDate.getUTCMonth() - m);
    const dueDate = new Date(issuedDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);

    ORGS.forEach((o, i) => {
      let status: InvoiceStatus = 'PAID';
      if (m === 0) status = i === 1 ? 'DUE' : 'PAID';
      if (m === 0 && i === 2) status = 'OVERDUE';

      out.push({
        id: `inv-${o.id}-${m}`,
        number: `INV-${o.id.toUpperCase().slice(-1)}-${(2026 - 0).toString()}${String(issuedDate.getUTCMonth() + 1).padStart(2, '0')}`,
        orgId: o.id,
        orgName: o.name,
        planName: o.plan,
        amountUsd: o.amount,
        issuedAt: issuedDate.toISOString(),
        dueAt: dueDate.toISOString(),
        status,
      });
    });
  }
  return out.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
};

export const mockInvoices: MockInvoice[] = buildInvoices();

export const invoicesForOrg = (orgId: string): MockInvoice[] =>
  mockInvoices.filter((i) => i.orgId === orgId);
