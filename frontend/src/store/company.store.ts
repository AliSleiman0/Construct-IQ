import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SelectedCompany {
  id: string;
  name: string;
  slug: string;
}

interface CompanyState {
  selectedCompany: SelectedCompany | null;
  setSelectedCompany: (company: SelectedCompany) => void;
  clearSelectedCompany: () => void;
}

const SELECTED_ORG_COOKIE = 'selected_org_id';
const COOKIE_MAX_AGE_DAYS = 7;

const writeSelectedOrgCookie = (id: string | null) => {
  if (typeof document === 'undefined') return;
  if (id) {
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${SELECTED_ORG_COOKIE}=${id}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${SELECTED_ORG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};

/**
 * Holds the org context Super Admins have selected. Mirrored into a
 * non-httpOnly `selected_org_id` cookie so the (app)/layout.tsx Server
 * Component can read it before rendering. The Zustand persist middleware
 * keeps the same value in localStorage for client convenience and so
 * the axios `X-Organization-Id` injector has it available synchronously.
 */
export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompany: null,
      setSelectedCompany: (company) => {
        writeSelectedOrgCookie(company.id);
        set({ selectedCompany: company });
      },
      clearSelectedCompany: () => {
        writeSelectedOrgCookie(null);
        set({ selectedCompany: null });
      },
    }),
    { name: 'constructiq-selected-company' },
  ),
);
