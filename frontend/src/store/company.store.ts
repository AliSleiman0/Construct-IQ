import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SelectedCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface CompanyState {
  selectedCompany: SelectedCompany | null;
  setSelectedCompany: (company: SelectedCompany) => void;
  clearSelectedCompany: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompany: null,
      setSelectedCompany: (company) => {
        // Also set a plain cookie so Next.js middleware can read it
        if (typeof document !== 'undefined') {
          document.cookie = `selected_company=${company.id}; path=/; max-age=${7 * 24 * 3600}`;
        }
        set({ selectedCompany: company });
      },
      clearSelectedCompany: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'selected_company=; path=/; max-age=0';
        }
        set({ selectedCompany: null });
      },
    }),
    { name: 'constructiq-selected-company' },
  ),
);
