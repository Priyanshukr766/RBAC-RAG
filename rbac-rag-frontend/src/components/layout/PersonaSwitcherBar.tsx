import React, { useState } from 'react';
import { RefreshCw, LogOut, Check } from 'lucide-react';
import { useAuth, DEMO_PERSONAS, DemoPersonaKey } from '../../context/AuthContext';
import RoleBadge from '../common/RoleBadge';
import { clsx } from 'clsx';

interface PersonaSwitcherBarProps {
  onOpenWelcomeNote?: () => void;
}

export const PersonaSwitcherBar: React.FC<PersonaSwitcherBarProps> = ({ onOpenWelcomeNote }) => {
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

  const ROLE_SHORT_LABELS: Record<string, string> = {
    hr: 'HR',
    engineering: 'Eng',
    finance: 'Fin',
    intern: 'Intern',
    admin: 'Admin',
    all_employees: 'All',
  };

  const activeDemoPersona = Object.values(DEMO_PERSONAS).find(
    (p) => p.email.toLowerCase() === user?.email.toLowerCase()
  );
  const displayName = user?.full_name || activeDemoPersona?.name || user?.email || 'Not Signed In';
  const avatarInitials = activeDemoPersona?.avatarText || (displayName.length >= 2 ? displayName.slice(0, 2).toUpperCase() : '??');

  return (
    <header className="w-full bg-white border-b border-zinc-200/80 px-3 sm:px-5 py-2.5 sticky top-0 z-30">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
        {/* Left: Active User & Live Role Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-medium text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
              {avatarInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-zinc-900 leading-tight truncate max-w-[120px] sm:max-w-[180px]">
                  {displayName}
                </span>
                {user && <RoleBadge role={user.role} size="xs" variant="subtle" />}
              </div>
              <span className="text-[11px] text-zinc-500 truncate max-w-[140px] sm:max-w-[200px]">
                {user ? user.email : 'Demo Sandbox Mode'}
              </span>
            </div>
          </div>

          {/* Sync Live Role Button */}
          {user && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleSyncLiveRole}
                disabled={isSyncing || isLoading}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                  'border-zinc-200 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950',
                  'disabled:opacity-50'
                )}
                title="Refresh user live role and permissions"
              >
                <RefreshCw
                  className={clsx('w-3 h-3 text-zinc-600', isSyncing && 'animate-spin text-zinc-900')}
                />
                <span className="hidden md:inline text-[11px]">Sync Role</span>
              </button>

              {syncFeedback && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full font-medium animate-fade-in">
                  <Check className="w-2.5 h-2.5 text-zinc-700" />
                  {syncFeedback}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center/Right: 1-Click Demo Persona Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap flex-shrink-0">
          <div className="inline-flex items-center p-0.5 sm:p-1 bg-zinc-100/90 rounded-full border border-zinc-200/80 gap-0.5 sm:gap-1 flex-nowrap">
            {personaOrder.map((key) => {
              const p = DEMO_PERSONAS[key];
              const isActive = activePersonaKey === key || (user && user.role === p.role && user.email === p.email);
              const shortRole = ROLE_SHORT_LABELS[p.role] || p.role.toUpperCase();
              const firstName = p.key === 'system_admin' ? 'Admin' : p.name.split(' ')[0];

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isLoading}
                  onClick={() => switchDemoPersona(key)}
                  className={clsx(
                    'inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0',
                    isActive
                      ? 'bg-zinc-900 text-white shadow-xs font-medium'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60',
                    isLoading && 'pointer-events-none opacity-60'
                  )}
                  title={`Switch to ${p.name} (${p.role.toUpperCase()})`}
                >
                  <span>{firstName}</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    ({shortRole})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Developer Welcome Note */}
          {onOpenWelcomeNote && (
            <button
              type="button"
              onClick={onOpenWelcomeNote}
              className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 transition-colors ml-0.5 flex-shrink-0"
              title="Read Priyanshu's developer note & project overview"
            >
              Project Note
            </button>
          )}

          {/* Logout */}
          {user && (
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors ml-0.5 flex-shrink-0"
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

