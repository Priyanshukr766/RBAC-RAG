import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AllowedRole } from '../../types/auth';
import RoleBadge from '../common/RoleBadge';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AllowedRole | AllowedRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, token, isLoading, switchDemoPersona } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm font-medium text-on-surface-variant font-mono">
          Verifying Session Credentials...
        </span>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role authorization check
  if (requiredRole) {
    const allowedList = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const isAuthorized = allowedList.includes(user.role);

    if (!isAuthorized) {
      return (
        <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
          <div className="max-w-md w-full flex flex-col items-center">
            {/* Subtle Eyebrow / Kicker */}
            <span className="text-[11px] font-medium tracking-widest uppercase text-zinc-400 mb-2">
              403 • Restricted Access
            </span>

            {/* Grok-style Minimal Heading */}
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-950 mb-2">
              Role Authorization Required
            </h1>

            {/* Subtext */}
            <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-4 leading-relaxed">
              This workspace is restricted to{' '}
              <span className="text-zinc-900 font-medium">
                {allowedList.join(' or ').toUpperCase()}
              </span>{' '}
              personnel. Your current authenticated role is:
            </p>

            {/* Subtle Role Badge */}
            <div className="mb-6">
              <RoleBadge role={user.role} size="md" variant="subtle" />
            </div>

            {/* Clean inline metadata (no box) */}
            <div className="text-xs text-zinc-400 font-mono mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span>{location.pathname}</span>
              <span>•</span>
              <span>{user.email}</span>
            </div>

            {/* Grok-style Pill Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-zinc-200 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Chat</span>
              </button>

              <button
                type="button"
                onClick={() => switchDemoPersona('system_admin')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Switch to Admin Persona</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

