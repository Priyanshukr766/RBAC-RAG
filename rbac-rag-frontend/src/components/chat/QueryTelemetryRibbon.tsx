import React from 'react';
import { AlertCircle } from 'lucide-react';
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
        <RoleBadge role={effectiveRole} size="xs" variant="subtle" />

        {/* Security / Block Badge - Only displayed if query was intercepted */}
        {isInjectionBlocked ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-900 border border-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>Blocked: Prompt Injection</span>
          </span>
        ) : isScopeBlocked ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-900 border border-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span>Blocked: Out of Scope</span>
          </span>
        ) : !isPassed ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            <span>Status: {guardrailStatus}</span>
          </span>
        ) : null}

        {/* Cache vs Retrieval Badge */}
        {cacheHit ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200" title="Retrieved from cache">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <span>Cache Hit</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-normal bg-zinc-50 text-zinc-600 border border-zinc-200" title="Hybrid Vector & Keyword Search">
            <span>Hybrid Search</span>
            {retrievedChunkCount > 0 && (
              <span className="font-mono text-[10px] text-zinc-400">
                ({retrievedChunkCount} chunks)
              </span>
            )}
          </span>
        )}

        {/* Round-Trip Latency Badge */}
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border bg-zinc-50 text-zinc-600 border-zinc-200"
          title="Total round-trip pipeline latency"
        >
          <span>{latencyMs} ms</span>
        </span>
      </div>

      {/* Expanded Security Guardrail Callout Banner if Blocked */}
      {!isPassed && (
        <div className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-800" />
          <div className="space-y-0.5">
            <div className="font-medium text-zinc-950">
              {isInjectionBlocked
                ? 'Input Guardrail Triggered: Adversarial Prompt Injection'
                : 'Workplace Scope Boundary Enforced'}
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed font-sans">
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

