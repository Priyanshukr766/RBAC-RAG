import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { AuditLogEntry } from '../../types/chat';
import { fetchAuditLogs } from '../../api/chatApi';
import RoleBadge from '../common/RoleBadge';
import { clsx } from 'clsx';

interface AuditLogTableProps {
  className?: string;
  refreshTrigger?: number;
  onLogsLoaded?: (logs: AuditLogEntry[]) => void;
}

type FilterTab = 'all' | 'blocked' | 'cache_hits' | 'passed';

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  className,
  refreshTrigger = 0,
  onLogsLoaded,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAuditLogs(150);
      setLogs(data);
      if (onLogsLoaded) {
        onLogsLoaded(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onLogsLoaded]);

  // Initial fetch and trigger on external refresh
  useEffect(() => {
    loadLogs();
  }, [loadLogs, refreshTrigger]);

  // Auto-refresh interval (polling every 10 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  // Filter logs by tab & search query
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Tab filter
      if (activeTab === 'blocked') {
        const isBlocked =
          log.guardrail_status === 'blocked_injection' ||
          log.guardrail_status === 'blocked_out_of_scope' ||
          String(log.guardrail_status).toLowerCase().includes('blocked');
        if (!isBlocked) return false;
      } else if (activeTab === 'cache_hits') {
        if (!log.cache_hit) return false;
      } else if (activeTab === 'passed') {
        if (log.guardrail_status !== 'passed') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = log.query_text.toLowerCase().includes(q);
        const matchesEmail = (log.user_email || log.email || '').toLowerCase().includes(q);
        const matchesName = (log.user_full_name || '').toLowerCase().includes(q);
        const matchesRole = log.user_role_at_query.toLowerCase().includes(q);
        const matchesGuardrail = String(log.guardrail_status).toLowerCase().includes(q);
        const matchesChunks = (log.retrieved_chunk_ids || []).some((id) =>
          id.toLowerCase().includes(q)
        );
        return (
          matchesQuery ||
          matchesEmail ||
          matchesName ||
          matchesRole ||
          matchesGuardrail ||
          matchesChunks
        );
      }

      return true;
    });
  }, [logs, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Helper to copy chunk ID or text
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return iso;
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Metrics for filter tabs
  const tabCounts = useMemo(() => {
    const total = logs.length;
    const blocked = logs.filter(
      (l) =>
        l.guardrail_status === 'blocked_injection' ||
        l.guardrail_status === 'blocked_out_of_scope' ||
        String(l.guardrail_status).toLowerCase().includes('blocked')
    ).length;
    const cacheHits = logs.filter((l) => l.cache_hit).length;
    const passed = logs.filter((l) => l.guardrail_status === 'passed').length;
    return { total, blocked, cacheHits, passed };
  }, [logs]);

  return (
    <div className={clsx('card-level-2 p-6 flex flex-col space-y-5', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-on-surface">
              Immutable Security & Query Audit Log
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {logs.length} Total Events
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time tamper-evident audit trail capturing query events, user roles, security intercepts, and cache performance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-stretch md:self-auto">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border',
              autoRefresh
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            )}
            title="Auto-refresh poll every 10 seconds"
          >
            <Radio
              className={clsx(
                'w-3.5 h-3.5',
                autoRefresh ? 'text-white animate-pulse' : 'text-zinc-400'
              )}
            />
            <span>{autoRefresh ? 'Live Polling Active' : 'Polling Paused'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors disabled:opacity-50"
            title="Refresh Audit Logs Now"
          >
            <RefreshCw className={clsx('w-4 h-4 text-zinc-600', loading && 'animate-spin text-zinc-950')} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'all'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200'
            )}
          >
            <span>All Queries</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px]',
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-200/80 text-zinc-700'
              )}
            >
              {tabCounts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'blocked'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200'
            )}
          >
            <span>Blocked Attacks</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px]',
                activeTab === 'blocked' ? 'bg-white/20 text-white' : 'bg-zinc-200/80 text-zinc-700'
              )}
            >
              {tabCounts.blocked}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cache_hits')}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'cache_hits'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200'
            )}
          >
            <span>Cache Hits</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px]',
                activeTab === 'cache_hits'
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-200/80 text-zinc-700'
              )}
            >
              {tabCounts.cacheHits}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('passed')}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'passed'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200'
            )}
          >
            <span>Passed</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px]',
                activeTab === 'passed'
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-200/80 text-zinc-700'
              )}
            >
              {tabCounts.passed}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search query, user, role..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl text-zinc-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            className="text-xs font-medium text-zinc-900 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-xs">
        <table className="w-full text-left text-xs text-zinc-900">
          <thead className="bg-zinc-50/80 border-b border-zinc-200 font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-3 whitespace-nowrap">User & Role</th>
              <th className="px-4 py-3 min-w-[240px]">Query Text</th>
              <th className="px-4 py-3 whitespace-nowrap">Security Check</th>
              <th className="px-4 py-3 whitespace-nowrap">Cache</th>
              <th className="px-4 py-3 whitespace-nowrap">Retrieved Chunks</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Latency</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && logs.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5">
                    <div className="h-3.5 bg-slate-200 rounded w-16" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-4 bg-slate-200 rounded w-28" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-3.5 bg-slate-200 rounded w-48" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-5 bg-slate-200 rounded-full w-20" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-5 bg-slate-200 rounded-full w-12" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-5 bg-slate-200 rounded-full w-16" />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="h-3.5 bg-slate-200 rounded w-12 ml-auto" />
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <div className="h-6 w-6 bg-slate-200 rounded-full mx-auto" />
                  </td>
                </tr>
              ))
            ) : paginatedLogs.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="font-semibold text-slate-700">No audit records found</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {searchQuery
                        ? `No log entries match "${searchQuery}". Try clearing filters or search.`
                        : 'No query activity has been recorded yet. Fire a prompt in Employee Chat or Live Compare to generate audit events.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const isInjectionBlocked = log.guardrail_status === 'blocked_injection';
                const isOutOfScope = log.guardrail_status === 'blocked_out_of_scope';
                const isPassed = log.guardrail_status === 'passed';
                const chunkCount = (log.retrieved_chunk_ids || []).length;
                const userIdentifier =
                  log.user_email || log.email || log.user_full_name || `User #${log.user_id || '?'}`;

                return (
                  <tr
                    key={log.log_id}
                    className={clsx(
                      'hover:bg-slate-50/80 transition-colors duration-150',
                      isInjectionBlocked && 'bg-rose-50/30'
                    )}
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-slate-800 font-medium">
                        {formatTimestamp(log.created_at)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatDate(log.created_at)}
                      </div>
                    </td>

                    {/* User & Role */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <RoleBadge role={log.user_role_at_query} size="xs" variant="subtle" />
                        <span
                          className="font-medium text-slate-800 truncate max-w-[130px]"
                          title={userIdentifier}
                        >
                          {userIdentifier}
                        </span>
                      </div>
                    </td>

                    {/* Query Text */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1.5">
                        {isInjectionBlocked && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                        )}
                        <span
                          className={clsx(
                            'line-clamp-2 text-xs leading-relaxed',
                            isInjectionBlocked
                              ? 'text-rose-900 font-medium font-mono'
                              : 'text-slate-800'
                          )}
                          title={log.query_text}
                        >
                          {log.query_text}
                        </span>
                      </div>
                    </td>

                    {/* Guardrail Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                          <span>Passed</span>
                        </span>
                      ) : isInjectionBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-white border border-zinc-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          <span>Blocked: Injection</span>
                        </span>
                      ) : isOutOfScope ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-900 border border-zinc-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          <span>Blocked: Scope</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {log.guardrail_status}
                        </span>
                      )}
                    </td>

                    {/* Cache */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.cache_hit ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                          <span>HIT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-zinc-50 text-zinc-500 border border-zinc-200">
                          <span>MISS</span>
                        </span>
                      )}
                    </td>

                    {/* Retrieved Chunks */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors duration-150',
                          chunkCount > 0
                            ? 'bg-blue-50 text-primary border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        )}
                        title="Click to view retrieved chunk IDs"
                      >
                        <span>{chunkCount} {chunkCount === 1 ? 'Chunk' : 'Chunks'}</span>
                      </button>
                    </td>

                    {/* Latency */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span
                        className={clsx(
                          'font-mono text-xs font-semibold',
                          log.latency_ms < 50
                            ? 'text-emerald-600'
                            : log.latency_ms < 400
                            ? 'text-primary'
                            : 'text-amber-600'
                        )}
                      >
                        {Number(log.latency_ms || 0).toFixed(1)} ms
                      </span>
                    </td>

                    {/* Inspect Button */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-full hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors duration-150"
                        title="View Full Audit Event Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-on-surface-variant">
        <div>
          Showing{' '}
          <span className="font-semibold text-on-surface">
            {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-on-surface">
            {Math.min(currentPage * pageSize, filteredLogs.length)}
          </span>{' '}
          of <span className="font-semibold text-on-surface">{filteredLogs.length}</span> entries
          {searchQuery && ` (filtered from ${logs.length} total)`}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 text-xs font-medium text-slate-700">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inspect Detail Slide-over / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Audit Log Record #{selectedLog.log_id}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedLog.created_at}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Telemetry Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Role
                  </div>
                  <RoleBadge role={selectedLog.user_role_at_query} size="sm" variant="subtle" />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Security Check
                  </div>
                  <span
                    className={clsx(
                      'inline-block px-2 py-0.5 rounded-md font-semibold text-[11px]',
                      selectedLog.guardrail_status === 'passed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    )}
                  >
                    {selectedLog.guardrail_status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cache
                  </div>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px]',
                      selectedLog.cache_hit
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {selectedLog.cache_hit ? 'HIT' : 'MISS'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Latency
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {Number(selectedLog.latency_ms || 0).toFixed(2)} ms
                  </span>
                </div>
              </div>

              {/* User Identity */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  User Identity & Session
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
                  <div>
                    <span className="text-slate-400">User ID:</span> {selectedLog.user_id ?? 'None (Unauthenticated/Mock)'}
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span> {selectedLog.user_email || selectedLog.email || 'N/A'}
                  </div>
                  {selectedLog.user_full_name && (
                    <div>
                      <span className="text-slate-400">Full Name:</span> {selectedLog.user_full_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Query Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Query Text (Prompt)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedLog.query_text, 'query')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    {copiedId === 'query' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                  {selectedLog.query_text}
                </div>
              </div>

              {/* Retrieved Chunks UUIDs */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Retrieved Vector Chunks ({selectedLog.retrieved_chunk_ids?.length || 0})
                </label>
                {selectedLog.retrieved_chunk_ids && selectedLog.retrieved_chunk_ids.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {selectedLog.retrieved_chunk_ids.map((chunkId, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono text-[11px]"
                      >
                        <span className="text-slate-700 truncate mr-2">{chunkId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(chunkId, `chunk-${idx}`)}
                          className="text-slate-400 hover:text-slate-700 shrink-0"
                          title="Copy UUID"
                        >
                          {copiedId === `chunk-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-xs">
                    No chunks were retrieved for this query (blocked by guardrails, zero matching RLS records, or pure out-of-scope rejection).
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Log ID: {selectedLog.log_id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn-primary py-1.5 px-5 text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogTable;
