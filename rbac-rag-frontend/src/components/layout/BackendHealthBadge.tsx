import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/axiosClient';
import { clsx } from 'clsx';

interface HealthData {
  status: string;
  rls_enforced?: boolean;
  app_name?: string;
}

interface BackendHealthBadgeProps {
  compact?: boolean;
  className?: string;
}

export const BackendHealthBadge: React.FC<BackendHealthBadgeProps> = ({
  compact = true,
  className,
}) => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await apiClient.get<HealthData>('/health', { timeout: 4000 });
      if (res.status === 200 && res.data.status === 'healthy') {
        setHealth(res.data);
        setIsHealthy(true);
      } else {
        setIsHealthy(false);
      }
    } catch {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium border transition-all duration-200 select-none',
          isHealthy === true
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : isHealthy === false
            ? 'bg-error-container/20 text-error border-error/30'
            : 'bg-surface-container-low text-on-surface-variant border-surface-container-high',
          className
        )}
        title={
          isHealthy
            ? `Backend Online (${health?.app_name || 'FastAPI'}) • Last checked: ${lastChecked?.toLocaleTimeString()}`
            : 'FastAPI Backend unreachable at http://localhost:8000'
        }
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          {isHealthy === true && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={clsx(
              'relative inline-flex rounded-full h-2 w-2',
              isHealthy === true
                ? 'bg-emerald-500'
                : isHealthy === false
                ? 'bg-error'
                : 'bg-on-surface-variant/40'
            )}
          ></span>
        </span>

        <span className="font-mono font-medium">
          {isHealthy === true
            ? 'Backend Online'
            : isHealthy === false
            ? 'Backend Offline (8000)'
            : 'Connecting...'}
        </span>

        <button
          type="button"
          onClick={checkHealth}
          disabled={isChecking}
          className="hover:opacity-75 focus:outline-none ml-0.5"
          title="Refresh health status"
        >
          <RefreshCw className={clsx('w-3 h-3', isChecking && 'animate-spin')} />
        </button>
      </div>
    );
  }

  // Full Banner Mode (e.g. for offline notifications)
  if (isHealthy === false) {
    return (
      <div className={clsx('p-3 rounded-lg bg-error-container/25 border border-error/40 flex items-center justify-between text-xs text-error gap-3', className)}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Backend Offline:</strong> Unable to connect to FastAPI at{' '}
            <code className="font-mono bg-white/60 px-1 py-0.5 rounded">http://localhost:8000</code>. Ensure Uvicorn server is running.
          </span>
        </div>
        <button
          type="button"
          onClick={checkHealth}
          disabled={isChecking}
          className="btn-secondary px-3 py-1 text-xs border-error/40 text-error hover:bg-error-container/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 gap-2', className)}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="font-medium">
          FastAPI Backend Online
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-700">
        <span>Status: Connected</span>
      </div>
    </div>
  );
};

export default BackendHealthBadge;

