import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AllowedRole } from '../../types/auth';
import { GuardrailStatus } from '../../types/chat';
import RoleBadge from '../common/RoleBadge';
import { clsx } from 'clsx';

interface QueryTelemetryRibbonProps {
  effectiveRole: AllowedRole;
  guardrailStatus: GuardrailStatus | string;
  guardrailReason?: string | null;
  cacheHit: boolean;
  latencyMs: number;
  retrievedChunkCount?: number;
  className?: string;
}

export const QueryTelemetryRibbon: React.FC<QueryTelemetryRibbonProps> = ({
  effectiveRole,
  guardrailStatus,
  guardrailReason,
  cacheHit,
  latencyMs,
  retrievedChunkCount = 0,
  className,
}) => {
  const isPassed = guardrailStatus === 'passed';
  const isInjectionBlocked = guardrailStatus === 'blocked_injection';
  const isScopeBlocked = guardrailStatus === 'blocked_out_of_scope';

  return (
    <div className={clsx('space-y-2 select-none', className)}>
      {/* Top Telemetry Pills Row */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {/* Role Badge */}
        <RoleBadge role={effectiveRole} size="xs" variant="solid" />

        {/* Security / Block Badge - Only displayed if query was intercepted */}
        {isInjectionBlocked ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-role-hr border border-red-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Blocked: Prompt Injection</span>
          </span>
        ) : isScopeBlocked ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Blocked: Out of Scope</span>
          </span>
        ) : !isPassed ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Status: {guardrailStatus}</span>
          </span>
        ) : null}

        {/* Cache vs Retrieval Badge */}
        {cacheHit ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200" title="Retrieved from cache">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Cache Hit</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200" title="Hybrid Vector & Keyword Search">
            <span>Hybrid Search</span>
            {retrievedChunkCount > 0 && (
              <span className="font-mono text-[10px] text-slate-400">
                ({retrievedChunkCount} chunks)
              </span>
            )}
          </span>
        )}

        {/* 4. Round-Trip Latency Badge */}
        <span
          className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border',
            latencyMs < 50
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          )}
          title="Total round-trip pipeline latency"
        >
          <span>{latencyMs} ms</span>
        </span>
      </div>

      {/* Expanded Security Guardrail Callout Banner if Blocked */}
      {!isPassed && (
        <div
          className={clsx(
            'p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in',
            isInjectionBlocked
              ? 'bg-red-50/80 border-red-300 text-role-hr'
              : 'bg-amber-50/80 border-amber-300 text-amber-900'
          )}
        >
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">
              {isInjectionBlocked
                ? 'Input Guardrail Triggered: Adversarial Prompt Injection'
                : 'Workplace Scope Boundary Enforced'}
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed font-sans">
              {guardrailReason ||
                (isInjectionBlocked
                  ? 'The system detected an instruction override, persona-spoofing attempt, or forbidden role bypass pattern. Query execution halted before vector retrieval.'
                  : 'This inquiry does not pertain to workplace policies, engineering systems, finance, or corporate documents.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryTelemetryRibbon;

