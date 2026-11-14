import React from 'react';
import { GitCompare, Loader2 } from 'lucide-react';
import { DemoPersonaKey, DEMO_PERSONAS } from '../../context/AuthContext';
import RoleBadge from '../common/RoleBadge';
import { clsx } from 'clsx';

interface SplitComparisonHeaderProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
  leftPersonaKey: DemoPersonaKey;
  rightPersonaKey: DemoPersonaKey;
  onSelectLeftPersona: (key: DemoPersonaKey) => void;
  onSelectRightPersona: (key: DemoPersonaKey) => void;
}

export const COMPARISON_PROMPTS = [
  {
    id: 'salary-compare',
    title: 'Salary & Compensation',
    query: "What is Neha Sharma's base salary and retention bonus?",
    note: 'HR sees exact salary; Engineer blocked by RLS',
  },
  {
    id: 'cloud-spend',
    title: 'AWS Cloud Spend',
    query: 'What was our Q3 AWS cloud spend and budget variance?',
    note: 'Finance sees budgets; HR blocked by RLS',
  },
  {
    id: 'runbook-error',
    title: 'Engineering Runbook',
    query: 'How do we resolve Error code ERR-001 on the payment worker pod?',
    note: 'Engineer sees infra steps; Intern restricted',
  },
  {
    id: 'public-leave',
    title: 'Company Leave Policy',
    query: 'How many paid annual leave and sick days do employees receive?',
    note: 'Universal policy; both roles see identical chunks',
  },
];

export const SplitComparisonHeader: React.FC<SplitComparisonHeaderProps> = ({
  prompt,
  onPromptChange,
  onExecute,
  isExecuting,
  leftPersonaKey,
  rightPersonaKey,
  onSelectLeftPersona,
  onSelectRightPersona,
}) => {
  const personaOptions: DemoPersonaKey[] = [
    'priya_hr',
    'arjun_eng',
    'vikram_finance',
    'neha_intern',
    'system_admin',
  ];

  const leftP = DEMO_PERSONAS[leftPersonaKey];
  const rightP = DEMO_PERSONAS[rightPersonaKey];

  return (
    <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 p-5 sm:p-6 space-y-5">
      {/* Persona Selection Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-surface-container-high">
        {/* Left Persona Picker */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0"
              style={{ backgroundColor: leftP.colorHex }}
            >
              {leftP.avatarText}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Left Comparison Persona:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">{leftP.name}</span>
                <RoleBadge role={leftP.role} size="xs" variant="solid" />
              </div>
            </div>
          </div>

          <select
            value={leftPersonaKey}
            onChange={(e) => onSelectLeftPersona(e.target.value as DemoPersonaKey)}
            disabled={isExecuting}
            className="input-field py-1 px-2.5 text-xs bg-white cursor-pointer"
          >
            {personaOptions.map((key) => {
              const p = DEMO_PERSONAS[key];
              return (
                <option key={key} value={key}>
                  {p.name} ({p.role.toUpperCase()})
                </option>
              );
            })}
          </select>
        </div>

        {/* Right Persona Picker */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0"
              style={{ backgroundColor: rightP.colorHex }}
            >
              {rightP.avatarText}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Right Comparison Persona:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">{rightP.name}</span>
                <RoleBadge role={rightP.role} size="xs" variant="solid" />
              </div>
            </div>
          </div>

          <select
            value={rightPersonaKey}
            onChange={(e) => onSelectRightPersona(e.target.value as DemoPersonaKey)}
            disabled={isExecuting}
            className="input-field py-1 px-2.5 text-xs bg-white cursor-pointer"
          >
            {personaOptions.map((key) => {
              const p = DEMO_PERSONAS[key];
              return (
                <option key={key} value={key}>
                  {p.name} ({p.role.toUpperCase()})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Suggested Comparison Prompt Chips */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-on-surface-variant">
          Recommended Live Interview Prompts:
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {COMPARISON_PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isExecuting}
              onClick={() => onPromptChange(item.query)}
              className={clsx(
                'flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg border text-xs text-left transition-all duration-200',
                prompt === item.query
                  ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
                  : 'border-surface-container-high bg-white hover:border-surface-container-highest text-on-surface'
              )}
              title={item.note}
            >
              <span className="font-semibold">{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Box & Simultaneous Fire CTA */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onExecute();
        }}
        className="flex flex-col sm:flex-row items-stretch gap-3"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            disabled={isExecuting}
            placeholder="Type any workplace query to fire simultaneously under both roles..."
            className="input-field w-full py-3 px-4 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!prompt.trim() || isExecuting}
          className="btn-primary px-6 py-3 text-sm flex items-center justify-center gap-2 flex-shrink-0 shadow-sm"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Querying PostgreSQL Under Both Roles...</span>
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4" />
              <span>Run Side-by-Side RBAC Comparison</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SplitComparisonHeader;

