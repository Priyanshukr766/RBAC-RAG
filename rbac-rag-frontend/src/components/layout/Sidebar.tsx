import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  GitCompare,
  FileUp,
  ShieldAlert,
  Shield,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: string;
  description: string;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems: NavItem[] = [
    {
      name: 'Employee Chat & Search',
      href: '/chat',
      icon: MessageSquare,
      description: 'Role-scoped retrieval & grounded answers',
    },
    {
      name: 'Split-Screen RBAC Compare',
      href: '/compare',
      icon: GitCompare,
      badge: 'DEMO',
      description: 'Priya (HR) vs. Arjun (Eng) side-by-side',
    },
    {
      name: 'HITL Visual Ingestion',
      href: '/admin/ingest',
      icon: FileUp,
      adminOnly: true,
      badge: 'ADMIN',
      description: 'PyMuPDF bounding-box review & Excel split',
    },
    {
      name: 'Security & Audit Logs',
      href: '/admin/security',
      icon: ShieldAlert,
      adminOnly: true,
      badge: 'ADMIN',
      description: 'Instant Redis role revocation & audit logs',
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-surface-container-high flex flex-col justify-between h-screen sticky top-0 z-20">
      {/* Top: Brand Header */}
      <div>
        <div className="p-5 border-b border-surface-container-high flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-on-surface truncate">
              RBAC RAG Core
            </div>
            <div className="text-[11px] text-primary font-medium tracking-wide truncate">
              Production Pipeline
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Workspaces
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const isLocked = item.adminOnly && !isAdmin;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={clsx(
                  'group flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left relative',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                )}
              >
                <item.icon
                  className={clsx(
                    'w-5 h-5 flex-shrink-0 mt-0.5 transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium leading-tight truncate">
                      {item.name}
                    </span>

                    {item.badge && (
                      <span
                        className={clsx(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider flex-shrink-0',
                          item.badge === 'ADMIN'
                            ? isAdmin
                              ? 'bg-slate-900 text-white'
                              : 'bg-surface-container-high text-on-surface-variant'
                            : 'bg-primary-container text-on-primary-container'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isLocked && (
                      <Lock className="w-3 h-3 text-on-surface-variant/70 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-on-surface-variant/80 mt-0.5 line-clamp-1 leading-normal font-normal">
                    {item.description}
                  </p>
                </div>

                {isActive && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: System Status */}
      <div className="p-3 bg-surface-container-lowest m-3 rounded-lg border border-surface-container-high flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-on-surface">System Online</span>
        </div>
        <span className="text-[10px] font-mono text-on-surface-variant">v1.0</span>
      </div>
    </aside>
  );
};

export default Sidebar;

