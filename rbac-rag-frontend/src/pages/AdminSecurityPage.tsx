import React, { useState, useMemo } from 'react';
import { RotateCw } from 'lucide-react';
import RoleRevocationPanel from '../components/admin/RoleRevocationPanel';
import AuditLogTable from '../components/admin/AuditLogTable';
import { AuditLogEntry } from '../types/chat';

export const AdminSecurityPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);

  // Compute live security metrics from loaded logs
  const metrics = useMemo(() => {
    const total = recentLogs.length;
    const blocked = recentLogs.filter(
      (l) =>
        l.guardrail_status === 'blocked_injection' ||
        l.guardrail_status === 'blocked_out_of_scope' ||
        String(l.guardrail_status).toLowerCase().includes('blocked')
    ).length;
    const injections = recentLogs.filter(
      (l) => l.guardrail_status === 'blocked_injection'
    ).length;
    const cacheHits = recentLogs.filter((l) => l.cache_hit).length;
    const cacheRate = total > 0 ? Math.round((cacheHits / total) * 100) : 0;

    const latencies = recentLogs.map((l) => Number(l.latency_ms || 0)).filter((n) => n > 0);
    const avgLatency =
      latencies.length > 0
        ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)
        : '0.0';

    return { total, blocked, injections, cacheHits, cacheRate, avgLatency };
  }, [recentLogs]);

  const handleManualRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Admin Security Command Center
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Role revocation benchmarks, live entitlement switches, and query audit logs.
          </p>
        </div>

        {/* Global Security Telemetry Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn-secondary py-2 px-4 text-xs flex items-center gap-2 shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-primary" />
            <span>Sync All Telemetry</span>
          </button>
        </div>
      </div>

      {/* KPI Security Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Query Activity */}
        <div className="card-level-2 p-5 bg-white border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Logged Queries
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-mono">
              {metrics.total}
            </span>
            <span className="text-xs font-medium text-slate-500">
              Audit Events
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Table: public.audit_logs
          </div>
        </div>

        {/* Card 2: Blocked Jailbreaks & Attacks */}
        <div className="card-level-2 p-5 bg-white border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Attacks Intercepted
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-rose-600 font-mono">
              {metrics.blocked}
            </span>
            <span className="text-xs font-medium text-rose-700/80">
              ({metrics.injections} Injections)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Input Policy Filter
          </div>
        </div>

        {/* Card 3: Role-Scoped Cache Hit Rate */}
        <div className="card-level-2 p-5 bg-white border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Cache Hit Rate
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-purple-700 font-mono">
              {metrics.cacheRate}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              ({metrics.cacheHits} Hits)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            SHA256:(Role+Query)
          </div>
        </div>

        {/* Card 4: Sub-Second Revocation Latency */}
        <div className="card-level-2 p-5 bg-white border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Avg Pipeline Latency
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-emerald-700 font-mono">
              {metrics.avgLatency}
            </span>
            <span className="text-xs font-semibold text-slate-500">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Revocation Latency: &lt; 1 ms
          </div>
        </div>
      </div>

      {/* Component 1: Sub-Second Role Revocation Tester Panel */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Live Permission Management & Sub-Second Revocation Benchmark
        </h2>
        <RoleRevocationPanel
          onActionComplete={handleManualRefresh}
        />
      </section>

      {/* Component 2: Immutable Security Audit Log Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Immutable Audit Trail & Intercepted Prompt Analysis
        </h2>
        <AuditLogTable
          refreshTrigger={refreshKey}
          onLogsLoaded={setRecentLogs}
        />
      </section>
    </div>
  );
};

export default AdminSecurityPage;
