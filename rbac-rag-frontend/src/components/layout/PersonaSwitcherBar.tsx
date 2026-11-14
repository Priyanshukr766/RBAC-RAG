import React, { useState } from 'react';
import { RefreshCw, LogOut, Check } from 'lucide-react';
import { useAuth, DEMO_PERSONAS, DemoPersonaKey } from '../../context/AuthContext';
import RoleBadge from '../common/RoleBadge';
import { clsx } from 'clsx';

export const PersonaSwitcherBar: React.FC = () => {
  const { user, activePersonaKey, switchDemoPersona, refreshLiveRole, logout, isLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncLiveRole = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const updated = await refreshLiveRole();
      if (updated) {
        setSyncFeedback(`Live role verified: ${updated.role.toUpperCase()}`);
      } else {
        setSyncFeedback('Offline / Unauthenticated');
      }
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const personaOrder: DemoPersonaKey[] = [
    'priya_hr',
    'arjun_eng',
    'vikram_finance',
    'neha_intern',
    'system_admin',
  ];

  return (
    <header className="w-full bg-white border-b border-surface-container-high px-4 py-2.5 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active User & Live Role Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {user?.full_name
                ? user.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : user?.email.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-on-surface leading-tight">
                  {user?.full_name || user?.email || 'Not Signed In'}
                </span>
                {user && <RoleBadge role={user.role} size="xs" variant="solid" />}
              </div>
              <span className="text-[11px] text-on-surface-variant font-mono">
                {user ? user.email : 'Demo Sandbox Mode'}
              </span>
            </div>
          </div>

          {/* Sync Live Role Button */}
          {user && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-surface-container-high">
              <button
                type="button"
                onClick={handleSyncLiveRole}
                disabled={isSyncing || isLoading}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all duration-200',
                  'border-surface-container-highest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                  'disabled:opacity-50'
                )}
                title="Refresh user profile and permissions"
              >
                <RefreshCw
                  className={clsx('w-3 h-3 text-primary', isSyncing && 'animate-spin')}
                />
                <span>Sync Live Role</span>
              </button>

              {syncFeedback && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-fade-in font-medium">
                  <Check className="w-2.5 h-2.5" />
                  {syncFeedback}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center/Right: 1-Click Demo Persona Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="hidden lg:flex items-center text-xs font-semibold text-slate-500 mr-1 uppercase tracking-wider text-[11px]">
            <span>1-Click Persona:</span>
          </div>

          <div className="inline-flex items-center p-1 bg-surface-container-low rounded-lg border border-surface-container-high gap-1">
            {personaOrder.map((key) => {
              const p = DEMO_PERSONAS[key];
              const isActive = activePersonaKey === key || (user && user.role === p.role && user.email === p.email);

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isLoading}
                  onClick={() => switchDemoPersona(key)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white text-on-surface shadow-sm font-semibold ring-2 ring-primary/40'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60',
                    isLoading && 'pointer-events-none opacity-60'
                  )}
                  title={`Switch to ${p.name} (${p.role.toUpperCase()})`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.colorHex }}
                  />
                  <span>{p.name.split(' ')[0]}</span>
                  <span className="text-[10px] uppercase font-bold opacity-75">
                    ({p.role === 'all_employees' ? 'pub' : p.role === 'engineering' ? 'eng' : p.role})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Logout */}
          {user && (
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all duration-200 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PersonaSwitcherBar;

