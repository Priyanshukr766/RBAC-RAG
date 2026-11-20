import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  GitCompare,
  FileUp,
  Activity,
  Layers,
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
      description: 'PyMuPDF visual review & role-scoped ingestion',
    },
    {
      name: 'Security & Audit Logs',
      href: '/admin/security',
      icon: Activity,
      adminOnly: true,
      badge: 'ADMIN',
      description: 'Instant Redis role revocation & audit logs',
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-zinc-200/80 flex flex-col justify-between h-screen sticky top-0 z-20">
      {/* Top: Brand Header */}
      <div>
        <div className="p-4 border-b border-zinc-200/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-zinc-950 truncate">
              RBAC RAG
            </div>
            {/* <div className="text-[11px] text-zinc-500 font-normal truncate">
              Enterprise Search
            </div> */}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            Workspaces
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={clsx(
                  'group flex items-start gap-2.5 p-2.5 rounded-xl transition-colors text-left relative',
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 font-medium'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                )}
              >
                <item.icon
                  className={clsx(
                    'w-4 h-4 flex-shrink-0 mt-0.5 transition-colors',
                    isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-700'
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
                          'text-[9px] font-medium px-1.5 py-0.2 rounded-full uppercase tracking-wider flex-shrink-0',
                          item.badge === 'ADMIN'
                            ? isAdmin
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-500'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200/80'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 leading-normal font-normal">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

