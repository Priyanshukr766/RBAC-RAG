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
        bgClass: 'bg-red-50 text-red-800 border-red-300',
        textClass: 'text-red-700',
        borderClass: 'border-red-400',
        hex: '#e02626',
        solidBgClass: 'bg-role-hr text-white',
        description: 'Employee compensation, performance appraisals, PIP records, and confidential HR documents.',
      };
    case 'finance':
      return {
        label: 'Finance & Planning',
        shortLabel: 'Finance',
        bgClass: 'bg-purple-50 text-purple-800 border-purple-300',
        textClass: 'text-purple-700',
        borderClass: 'border-purple-400',
        hex: '#9433d9',
        solidBgClass: 'bg-role-finance text-white',
        description: 'Operating budgets, burn rate, quarterly financial models, and executive revenue reports.',
      };
    case 'engineering':
      return {
        label: 'Engineering & Infra',
        shortLabel: 'Engineering',
        bgClass: 'bg-blue-50 text-blue-800 border-blue-300',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-400',
        hex: '#1a73e0',
        solidBgClass: 'bg-role-engineering text-white',
        description: 'Architecture diagrams, production runbooks, API keys, error remediation, and code repositories.',
      };
    case 'all_employees':
      return {
        label: 'All Employees (Public)',
        shortLabel: 'All Employees',
        bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-400',
        hex: '#1fa64c',
        solidBgClass: 'bg-role-public text-white',
        description: 'Company-wide policies, holiday calendars, public phone directories, and general benefit guides.',
      };
    case 'intern':
      return {
        label: 'Intern',
        shortLabel: 'Intern',
        bgClass: 'bg-amber-50 text-amber-800 border-amber-300',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-400',
        hex: '#d97706',
        solidBgClass: 'bg-role-intern text-white',
        description: 'Restricted onboarding material and read-only public company handbook.',
      };
    case 'admin':
      return {
        label: 'System Administrator',
        shortLabel: 'Admin',
        bgClass: 'bg-slate-100 text-slate-900 border-slate-400',
        textClass: 'text-slate-900',
        borderClass: 'border-slate-800',
        hex: '#0f172a',
        solidBgClass: 'bg-role-admin text-white',
        description: 'Full document ingestion pipeline control, PyMuPDF bounding-box review, and live role revocation.',
      };
    default: {
      const _exhaustiveCheck: never = role;
      return {
        label: _exhaustiveCheck,
        shortLabel: _exhaustiveCheck,
        bgClass: 'bg-slate-100 text-slate-800 border-slate-300',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-400',
        hex: '#64748b',
        solidBgClass: 'bg-slate-700 text-white',
        description: 'Standard access',
      };
    }
  }
}

