export type PaymentStatus = 'PAID' | 'DUE' | 'PENDING' | 'OVERDUE';

export interface MockPayment {
  id: string;
  buyerId: string;
  unitId: string;
  installmentNo: number;
  totalInstallments: number;
  label: string;            // "Down Payment", "Installment 4 of 12"
  amountUsd: number;
  dueDate: string;          // ISO
  paidAt: string | null;    // ISO
  status: PaymentStatus;
  invoiceNumber: string;
}

// 12-month installment schedule for Carlos Rivera — Tower Heights Unit 12B
// Total contract $410k. Down payment 20%, then 11 monthly installments.

const TOTAL = 410000;
const DOWN = TOTAL * 0.2;          // 82,000
const REMAINING = TOTAL - DOWN;     // 328,000
const PER_INSTALLMENT = REMAINING / 11; // ~29,818.18

const buildSchedule = (): MockPayment[] => {
  const out: MockPayment[] = [];
  const startDate = new Date('2026-01-01T00:00:00.000Z');

  out.push({
    id: 'pay-12b-0',
    buyerId: 'user-client',
    unitId: 'unit-12b',
    installmentNo: 0,
    totalInstallments: 12,
    label: 'Down Payment (20%)',
    amountUsd: DOWN,
    dueDate: '2026-01-01T00:00:00.000Z',
    paidAt: '2025-12-28T15:30:00.000Z',
    status: 'PAID',
    invoiceNumber: 'INV-12B-000',
  });

  // The "today" reference for the POC is 2026-04-28
  // → Months 1..3 paid, Month 4 due, Months 5..11 pending
  for (let i = 1; i <= 11; i += 1) {
    const due = new Date(startDate);
    due.setUTCMonth(due.getUTCMonth() + i);
    const dueIso = due.toISOString();

    let status: PaymentStatus = 'PENDING';
    let paidAt: string | null = null;

    if (i <= 3) {
      status = 'PAID';
      const paid = new Date(due);
      paid.setUTCDate(paid.getUTCDate() - 2);
      paidAt = paid.toISOString();
    } else if (i === 4) {
      status = 'DUE';
    }

    out.push({
      id: `pay-12b-${i}`,
      buyerId: 'user-client',
      unitId: 'unit-12b',
      installmentNo: i,
      totalInstallments: 12,
      label: `Installment ${i} of 11`,
      amountUsd: Math.round(PER_INSTALLMENT * 100) / 100,
      dueDate: dueIso,
      paidAt,
      status,
      invoiceNumber: `INV-12B-${String(i).padStart(3, '0')}`,
    });
  }
  return out;
};

export const mockPayments: MockPayment[] = buildSchedule();

export const paymentsForBuyer = (buyerId: string): MockPayment[] =>
  mockPayments.filter((p) => p.buyerId === buyerId);
