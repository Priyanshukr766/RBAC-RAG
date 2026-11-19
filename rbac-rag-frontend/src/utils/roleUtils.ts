import { AllowedRole } from '../types/auth';

export interface RoleMeta {
  label: string;
  shortLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
  solidBgClass: string;
  description: string;
}

export const ALL_ASSIGNABLE_ROLES: AllowedRole[] = [
  'all_employees',
  'engineering',
  'finance',
  'hr',
];

export function getRoleMeta(role: AllowedRole): RoleMeta {
  switch (role) {
    case 'hr':
      return {
        label: 'Human Resources',
        shortLabel: 'HR',
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Employee compensation, performance appraisals, PIP records, and confidential HR documents.',
      };
    case 'finance':
      return {
        label: 'Finance & Planning',
        shortLabel: 'Finance',
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Operating budgets, burn rate, quarterly financial models, and executive revenue reports.',
      };
    case 'engineering':
      return {
        label: 'Engineering & Infra',
        shortLabel: 'Engineering',
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Architecture diagrams, production runbooks, API keys, error remediation, and code repositories.',
      };
    case 'all_employees':
      return {
        label: 'All Employees (Public)',
        shortLabel: 'All Employees',
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Company-wide policies, holiday calendars, public phone directories, and general benefit guides.',
      };
    case 'intern':
      return {
        label: 'Intern',
        shortLabel: 'Intern',
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Restricted onboarding material and read-only public company handbook.',
      };
    case 'admin':
      return {
        label: 'System Administrator',
        shortLabel: 'Admin',
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Full document ingestion pipeline control, PyMuPDF bounding-box review, and live role revocation.',
      };
    default: {
      const _exhaustiveCheck: never = role;
      return {
        label: _exhaustiveCheck,
        shortLabel: _exhaustiveCheck,
        bgClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        hex: '#18181b',
        solidBgClass: 'bg-zinc-900 text-white',
        description: 'Standard access',
      };
    }
  }
}

