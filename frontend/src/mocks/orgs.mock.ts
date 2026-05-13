import type { Organization } from '@/types/auth.types';

export interface MockOrg extends Organization {
  email: string;
  address: string;
  phone: string;
  website: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  projectCount: number;
}

export const mockOrgs: MockOrg[] = [
  {
    id: 'org-company-a',
    name: 'Company A',
    slug: 'company-a',
    logoUrl: null,
    maxUsers: 50,
    email: 'contact@companya.com',
    address: '123 Builder Ave, Springfield',
    phone: '+1-555-0101',
    website: 'https://companya.com',
    isActive: true,
    createdAt: '2025-01-15T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    userCount: 12,
    projectCount: 3,
  },
  {
    id: 'org-company-b',
    name: 'Company B',
    slug: 'company-b',
    logoUrl: null,
    maxUsers: 25,
    email: 'hello@companyb.com',
    address: '456 Concrete Rd, Riverside',
    phone: '+1-555-0202',
    website: 'https://companyb.com',
    isActive: true,
    createdAt: '2025-03-22T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z',
    userCount: 7,
    projectCount: 2,
  },
  {
    id: 'org-company-c',
    name: 'Company C',
    slug: 'company-c',
    logoUrl: null,
    maxUsers: 100,
    email: 'info@companyc.com',
    address: '789 Steel Blvd, Lakewood',
    phone: '+1-555-0303',
    website: 'https://companyc.com',
    isActive: false,
    createdAt: '2025-06-10T08:00:00.000Z',
    updatedAt: '2026-02-18T08:00:00.000Z',
    userCount: 4,
    projectCount: 1,
  },
];

export const findOrgById = (id: string): MockOrg | undefined =>
  mockOrgs.find((o) => o.id === id);
