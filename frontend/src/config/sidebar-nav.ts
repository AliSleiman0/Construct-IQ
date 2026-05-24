import type { ElementType } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ExtensionIcon from '@mui/icons-material/Extension';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SettingsIcon from '@mui/icons-material/Settings';
import ContactsIcon from '@mui/icons-material/Contacts';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PeopleIcon from '@mui/icons-material/People';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ArticleIcon from '@mui/icons-material/Article';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StoreIcon from '@mui/icons-material/Store';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CalculateIcon from '@mui/icons-material/Calculate';
import ApartmentIcon from '@mui/icons-material/Apartment';
import HomeIcon from '@mui/icons-material/Home';
import ConstructionIcon from '@mui/icons-material/Construction';
import PaymentIcon from '@mui/icons-material/Payment';
import type { Role } from './roles';

export interface NavItem {
  label: string;
  href: string;
  icon: ElementType;
}

export const SIDEBAR_BY_ROLE: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/super-admin/dashboard', icon: DashboardIcon },
    { label: 'Organizations', href: '/super-admin/organizations', icon: BusinessIcon },
    { label: 'Org Admins', href: '/super-admin/org-admins', icon: AdminPanelSettingsIcon },
    { label: 'Plans', href: '/super-admin/plans', icon: WorkspacePremiumIcon },
    { label: 'Features', href: '/super-admin/features', icon: ExtensionIcon },
    { label: 'AI Plans', href: '/super-admin/ai-plans', icon: AutoAwesomeIcon },
    { label: 'AI Features', href: '/super-admin/ai-features', icon: PsychologyIcon },
    { label: 'Billing', href: '/super-admin/billing', icon: ReceiptLongIcon },
    { label: 'Audit Log', href: '/super-admin/audit-log', icon: HistoryIcon },
    { label: 'Tickets', href: '/super-admin/tickets', icon: ConfirmationNumberIcon },
    { label: 'Settings', href: '/super-admin/settings', icon: SettingsIcon },
  ],

  SUPPORT_AGENT: [
    { label: 'Dashboard', href: '/support-agent/dashboard', icon: DashboardIcon },
    { label: 'Tickets', href: '/support-agent/tickets', icon: ConfirmationNumberIcon },
    { label: 'Customers', href: '/support-agent/customers', icon: ContactsIcon },
  ],

  ORG_ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: DashboardIcon },
    { label: 'Projects', href: '/admin/projects', icon: FolderOpenIcon },
    { label: 'People', href: '/admin/people', icon: PeopleIcon },
    { label: 'Subscription', href: '/admin/subscription', icon: CardMembershipIcon },
    { label: 'Billing', href: '/admin/billing', icon: ReceiptLongIcon },
    { label: 'Reports', href: '/admin/reports', icon: AssessmentIcon },
    { label: 'Support', href: '/admin/support', icon: SupportAgentIcon },
    { label: 'Settings', href: '/admin/settings', icon: SettingsIcon },
  ],

  PM: [
    { label: 'Dashboard', href: '/pm/dashboard', icon: DashboardIcon },
    { label: 'Projects', href: '/pm/projects', icon: FolderOpenIcon },
    { label: 'Schedule', href: '/pm/schedule', icon: CalendarMonthIcon },
    { label: 'Tasks', href: '/pm/tasks', icon: TaskAltIcon },
    { label: 'Daily Reports', href: '/pm/reports', icon: ArticleIcon },
    { label: 'Issues', href: '/pm/issues', icon: ReportProblemIcon },
    { label: 'Budget', href: '/pm/budget', icon: AccountBalanceWalletIcon },
    { label: 'Procurement', href: '/pm/procurement', icon: LocalShippingIcon },
    { label: 'Documents', href: '/pm/documents', icon: FolderIcon },
  ],

  PROCUREMENT: [
    { label: 'Dashboard', href: '/procurement/dashboard', icon: DashboardIcon },
    { label: 'Material Requests', href: '/procurement/material-requests', icon: AssignmentIcon },
    { label: 'Suppliers', href: '/procurement/suppliers', icon: StoreIcon },
    { label: 'Purchase Orders', href: '/procurement/orders', icon: ShoppingCartIcon },
    { label: 'Deliveries', href: '/procurement/deliveries', icon: LocalShippingIcon },
  ],

  SURVEYOR: [
    { label: 'Dashboard', href: '/surveyor/dashboard', icon: DashboardIcon },
    { label: 'BOQ', href: '/surveyor/boq', icon: ListAltIcon },
    { label: 'Variations', href: '/surveyor/variations', icon: SwapHorizIcon },
    { label: 'Valuations', href: '/surveyor/valuations', icon: CalculateIcon },
    { label: 'Purchase Orders', href: '/surveyor/orders', icon: ShoppingCartIcon },
    { label: 'Budget', href: '/surveyor/budget', icon: AccountBalanceWalletIcon },
  ],

  SITE_ENG: [
    { label: 'Dashboard', href: '/site-eng/dashboard', icon: DashboardIcon },
    { label: 'Tasks', href: '/site-eng/tasks', icon: TaskAltIcon },
    { label: 'Daily Reports', href: '/site-eng/reports', icon: ArticleIcon },
    { label: 'Issues', href: '/site-eng/issues', icon: ReportProblemIcon },
    { label: 'Inspections', href: '/site-eng/inspections', icon: FactCheckIcon },
  ],

  CLIENT: [
    { label: 'Dashboard', href: '/client/dashboard', icon: DashboardIcon },
    { label: 'Building / Units', href: '/client/units', icon: ApartmentIcon },
    { label: 'My Property', href: '/client/my-property', icon: HomeIcon },
    { label: 'Construction Progress', href: '/client/progress', icon: ConstructionIcon },
    { label: 'Payments', href: '/client/payments', icon: PaymentIcon },
    { label: 'Documents', href: '/client/documents', icon: FolderIcon },
    { label: 'Support', href: '/client/support', icon: SupportAgentIcon },
  ],
};
