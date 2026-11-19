import React, { useState } from 'react';
import useDualPersonaTokens from '../hooks/useDualPersonaTokens';
import { sendChatQuery } from '../api/chatApi';
import { ChatQueryResponse, CitationItem } from '../types/chat';
import SplitComparisonHeader from '../components/chat/SplitComparisonHeader';
import QueryTelemetryRibbon from '../components/chat/QueryTelemetryRibbon';
import CitationCard from '../components/chat/CitationCard';
import PdfCitationDrawer from '../components/chat/PdfCitationDrawer';
import RoleBadge from '../components/common/RoleBadge';

export const SplitComparePage: React.FC = () => {
  const {
    leftPersonaKey,
    rightPersonaKey,
    leftToken,
    rightToken,
    leftPersona,
    rightPersona,
    isLoading: isTokensLoading,
    error: tokensError,
    setLeftPersonaKey,
    setRightPersonaKey,
  } = useDualPersonaTokens();

  const [prompt, setPrompt] = useState<string>(
    "What is Neha Sharma's base salary and retention bonus?"
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [leftResult, setLeftResult] = useState<ChatQueryResponse | null>(null);
  const [rightResult, setRightResult] = useState<ChatQueryResponse | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  const handleExecuteComparison = async () => {
    if (!prompt.trim() || isExecuting) return;

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const [resLeft, resRight] = await Promise.all([
        sendChatQuery(prompt, leftToken || undefined),
        sendChatQuery(prompt, rightToken || undefined),
      ]);
      setLeftResult(resLeft);
      setRightResult(resRight);
    } catch (err: any) {
      setExecutionError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to execute dual comparison query against FastAPI.'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Compute RLS Diff Metrics
  const leftChunkIds = leftResult?.retrieved_chunk_ids || [];
  const rightChunkIds = rightResult?.retrieved_chunk_ids || [];

  const commonChunkIds = leftChunkIds.filter((id) => rightChunkIds.includes(id));
  const restrictedLeftOnly = leftChunkIds.filter((id) => !rightChunkIds.includes(id));
  const restrictedRightOnly = rightChunkIds.filter((id) => !leftChunkIds.includes(id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Page Title & Mission Header */}
      <div>
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-medium tracking-wider uppercase mb-2">
          <span>Interactive Comparison</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950">
          Split-Screen Live RBAC Comparison
        </h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-3xl leading-relaxed">
          Compare real-time query responses across two roles simultaneously to evaluate data isolation.
        </p>
      </div>

      {tokensError && (
        <div className="p-4 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs">
          {tokensError}
        </div>
      )}

      {/* Top Single-Prompt Dual-Execution Form */}
      <SplitComparisonHeader
        prompt={prompt}
        onPromptChange={setPrompt}
        onExecute={handleExecuteComparison}
        isExecuting={isExecuting || isTokensLoading}
        leftPersonaKey={leftPersonaKey}
        rightPersonaKey={rightPersonaKey}
        onSelectLeftPersona={setLeftPersonaKey}
        onSelectRightPersona={setRightPersonaKey}
      />

      {executionError && (
        <div className="p-4 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs">
          {executionError}
        </div>
      )}

      {/* Diff Highlight Callout Ribbon (Appears after execution) */}
      {leftResult && rightResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium text-zinc-900 uppercase tracking-wider">
                Differential Telemetry
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Role Isolation Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Overlap */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                Public / Shared Chunks
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {commonChunkIds.length} Chunks Visible to Both
              </span>
            </div>

            {/* Left Exclusive */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                {leftPersona.name} ({leftPersona.role.toUpperCase()}) Only
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {restrictedLeftOnly.length} Restricted Chunks
              </span>
            </div>

            {/* Right Exclusive */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">
                {rightPersona.name} ({rightPersona.role.toUpperCase()}) Only
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {restrictedRightOnly.length} Restricted Chunks
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parallel Side-by-Side Comparison Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column (e.g. Priya - HR) */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden flex flex-col space-y-4 p-5 sm:p-6">
          {/* Persona Header Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {leftPersona.avatarText}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{leftPersona.name}</h3>
                  <RoleBadge role={leftPersona.role} size="xs" variant="subtle" />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {leftPersona.department}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">Left Pane</span>
          </div>

          {/* Left Content Area */}
          {!leftResult ? (
            <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
              <p>Click "Run Side-by-Side RBAC Comparison" above to query PostgreSQL as {leftPersona.name}.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Telemetry Ribbon */}
              <QueryTelemetryRibbon
                effectiveRole={leftResult.effective_role || leftPersona.role}
                guardrailStatus={leftResult.guardrail_status}
                guardrailReason={leftResult.guardrail_reason}
                cacheHit={leftResult.cache_hit}
                latencyMs={leftResult.latency_ms}
                retrievedChunkCount={leftResult.retrieved_chunk_ids?.length || 0}
              />

              {/* Answer Text */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 leading-relaxed whitespace-pre-wrap font-sans">
                {leftResult.answer}
              </div>

              {/* Citations List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Authorized Citations ({leftResult.citations?.length || 0})
                </span>

                {leftResult.citations && leftResult.citations.length > 0 ? (
                  <div className="space-y-2">
                    {leftResult.citations.map((cite) => (
                      <CitationCard
                        key={cite.chunk_id}
                        citation={cite}
                        onClick={() => setActiveCitation(cite)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-on-surface-variant">
                    No citation chunks accessible under {leftPersona.role.toUpperCase()} role policy.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (e.g. Arjun - Engineering) */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden flex flex-col space-y-4 p-5 sm:p-6">
          {/* Persona Header Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {rightPersona.avatarText}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{rightPersona.name}</h3>
                  <RoleBadge role={rightPersona.role} size="xs" variant="subtle" />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {rightPersona.department}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">Right Pane</span>
          </div>

          {/* Right Content Area */}
          {!rightResult ? (
            <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
              <p>Click "Run Side-by-Side RBAC Comparison" above to query PostgreSQL as {rightPersona.name}.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Telemetry Ribbon */}
              <QueryTelemetryRibbon
                effectiveRole={rightResult.effective_role || rightPersona.role}
                guardrailStatus={rightResult.guardrail_status}
                guardrailReason={rightResult.guardrail_reason}
                cacheHit={rightResult.cache_hit}
                latencyMs={rightResult.latency_ms}
                retrievedChunkCount={rightResult.retrieved_chunk_ids?.length || 0}
              />

              {/* Answer Text */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 leading-relaxed whitespace-pre-wrap font-sans">
                {rightResult.answer}
              </div>

              {/* Citations List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Authorized Citations ({rightResult.citations?.length || 0})
                </span>

                {rightResult.citations && rightResult.citations.length > 0 ? (
                  <div className="space-y-2">
                    {rightResult.citations.map((cite) => (
                      <CitationCard
                        key={cite.chunk_id}
                        citation={cite}
                        onClick={() => setActiveCitation(cite)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-on-surface-variant">
                    No citation chunks accessible under {rightPersona.role.toUpperCase()} role policy.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-Over PDF Citation Drawer */}
      <PdfCitationDrawer
        citation={activeCitation}
        isOpen={Boolean(activeCitation)}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};

export default SplitComparePage;
