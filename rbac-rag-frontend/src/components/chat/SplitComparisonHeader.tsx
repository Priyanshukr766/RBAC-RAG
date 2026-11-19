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
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Persona Selection Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-zinc-100">
        {/* Left Persona Picker */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium flex items-center justify-center flex-shrink-0">
              {leftP.avatarText}
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                Left Persona
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-900">{leftP.name}</span>
                <RoleBadge role={leftP.role} size="xs" variant="subtle" />
              </div>
            </div>
          </div>

          <select
            value={leftPersonaKey}
            onChange={(e) => onSelectLeftPersona(e.target.value as DemoPersonaKey)}
            disabled={isExecuting}
            className="py-1 px-2.5 text-xs bg-white text-zinc-800 border border-zinc-200 rounded-lg hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
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
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium flex items-center justify-center flex-shrink-0">
              {rightP.avatarText}
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                Right Persona
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-900">{rightP.name}</span>
                <RoleBadge role={rightP.role} size="xs" variant="subtle" />
              </div>
            </div>
          </div>

          <select
            value={rightPersonaKey}
            onChange={(e) => onSelectRightPersona(e.target.value as DemoPersonaKey)}
            disabled={isExecuting}
            className="py-1 px-2.5 text-xs bg-white text-zinc-800 border border-zinc-200 rounded-lg hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
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
        <div className="text-xs font-medium text-zinc-500">
          Recommended Prompts:
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {COMPARISON_PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isExecuting}
              onClick={() => onPromptChange(item.query)}
              className={clsx(
                'flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full border text-xs text-left transition-all',
                prompt === item.query
                  ? 'border-zinc-900 bg-zinc-100 text-zinc-950 font-medium ring-1 ring-zinc-900/10'
                  : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-600'
              )}
              title={item.note}
            >
              <span>{item.title}</span>
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

