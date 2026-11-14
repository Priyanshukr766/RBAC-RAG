import React from 'react';
import { clsx } from 'clsx';

interface SecurityColorLegendProps {
  compact?: boolean;
  className?: string;
}

export const SecurityColorLegend: React.FC<SecurityColorLegendProps> = ({
  compact = false,
  className,
}) => {
  const legendItems = [
    {
      role: 'hr',
      label: 'HR Only',
      desc: 'Compensation & Appraisals',
      colorHex: '#e02626',
      bgClass: 'bg-role-hr',
      textClass: 'text-role-hr',
    },
    {
      role: 'finance',
      label: 'Finance Only',
      desc: 'Budgets & Cloud Spend',
      colorHex: '#9433d9',
      bgClass: 'bg-role-finance',
      textClass: 'text-role-finance',
    },
    {
      role: 'engineering',
      label: 'Engineering Only',
      desc: 'Infra, Runbooks & APIs',
      colorHex: '#1a73e0',
      bgClass: 'bg-role-engineering',
      textClass: 'text-role-engineering',
    },
    {
      role: 'all_employees',
      label: 'All Employees',
      desc: 'Company-Wide Public',
      colorHex: '#1fa64c',
      bgClass: 'bg-role-public',
      textClass: 'text-role-public',
    },
  ];

  if (compact) {
    return (
      <div
        className={clsx(
          'flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-lg bg-white border border-surface-container-high text-xs select-none shadow-sm',
          className
        )}
      >
        <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
          Bounding Box Key:
        </span>

        {legendItems.map((item) => (
          <div key={item.role} className="flex items-center gap-1.5 font-medium text-[11px] text-on-surface">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.colorHex }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high space-y-2',
        className
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-on-surface uppercase tracking-wider">
          PyMuPDF Security Bounding-Box Color Map
        </span>
        <span className="text-[11px] font-mono text-on-surface-variant">Live Audit Trail</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {legendItems.map((item) => (
          <div
            key={item.role}
            className="p-2 rounded-lg bg-white border border-surface-container-high flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: item.colorHex }}
            />
            <div className="min-w-0">
              <span className="font-bold text-on-surface block leading-tight truncate">
                {item.label}
              </span>
              <span className="text-[10px] text-on-surface-variant truncate block leading-tight">
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityColorLegend;

