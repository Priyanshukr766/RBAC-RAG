import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Zap, Loader2 } from 'lucide-react';
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
        <div className="min-h-[80vh] flex items-center justify-center p-6 bg-surface-container-lowest">
          <div className="card-level-2 max-w-lg w-full p-8 text-center space-y-6 border-error/30">
            <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-900 shadow-sm">
              <Lock className="w-8 h-8 text-zinc-800" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-error-container/30 text-error text-xs font-bold tracking-wider uppercase">
                Access Denied (403 Forbidden)
              </div>
              <h2 className="text-2xl font-bold text-on-surface tracking-tight">
                Role Authorization Required
              </h2>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                This administration workspace is strictly restricted to{' '}
                <span className="font-semibold text-on-surface">
                  {allowedList.join(' or ').toUpperCase()}
                </span>{' '}
                personnel. Your authenticated role is:
              </p>
              <div className="pt-2 flex justify-center">
                <RoleBadge role={user.role} size="md" variant="solid" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface-variant text-left space-y-1 font-mono">
              <div>Endpoint: {location.pathname}</div>
              <div>User: {user.email} (ID #{user.user_id})</div>
              <div>Access Level: Admin Only</div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="btn-secondary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Chat</span>
              </button>

              <button
                type="button"
                onClick={() => switchDemoPersona('system_admin')}
                className="btn-primary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-1.5"
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

