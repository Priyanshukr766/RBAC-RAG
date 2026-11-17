import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth, DEMO_PERSONAS, DemoPersonaKey } from '../context/AuthContext';
import { registerUser } from '../api/authApi';
import RoleBadge from '../components/common/RoleBadge';
import { clsx } from 'clsx';

export const LoginPage: React.FC = () => {
  const { user, login, switchDemoPersona, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to appropriate workspace
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/ingest');
      } else {
        navigate('/chat');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        // Navigation handled by useEffect
      } else {
        await registerUser(email, password, fullName);
        setSuccessMessage('Registration successful! Logging in...');
        await login(email, password);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Authentication failed. Please check credentials.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPersonaSelect = async (key: DemoPersonaKey) => {
    setErrorMessage(null);
    try {
      await switchDemoPersona(key);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to switch demo persona.';
      setErrorMessage(detail);
    }
  };

  const demoPersonaKeys: DemoPersonaKey[] = [
    'priya_hr',
    'arjun_eng',
    'vikram_finance',
    'neha_intern',
    'system_admin',
  ];

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          RBAC RAG
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant max-w-sm mx-auto">
          Multi-role Enterprise Knowledge Base & Document Assistant
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Form: Sign In / Register Card (7 cols) */}
        <div className="md:col-span-7 bg-white rounded-xl border border-surface-container-high shadow-level-2 p-6 sm:p-8">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-surface-container-high mb-6 pb-2 justify-between items-center">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={clsx(
                  'pb-2 text-sm font-semibold transition-all duration-200 border-b-2 -mb-2.5',
                  mode === 'login'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={clsx(
                  'pb-2 text-sm font-semibold transition-all duration-200 border-b-2 -mb-2.5',
                  mode === 'register'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                )}
              >
                Register Employee
              </button>
            </div>
            <span className="text-xs text-on-surface-variant font-mono">
              FastAPI Auth v1
            </span>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maya Deshmukh"
                    className="input-field w-full pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="rounded-lg bg-surface-container/60 border border-surface-container-high p-3.5 text-xs text-on-surface-variant space-y-1.5">
                <div className="font-semibold text-on-surface flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Default Role: Employee (all_employees)
                </div>
                <p className="leading-relaxed">
                  Self-registered accounts automatically receive standard Employee baseline access. Elevated permissions (HR, Finance, Engineering, Admin) must be granted by a System Administrator.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="btn-primary w-full mt-6 py-3 text-sm flex items-center justify-center gap-2"
            >
              <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create & Authenticate Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: 1-Click Persona Cards for Instant Demos (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                1-Click Demo Personas
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Instantly authenticate as pre-configured enterprise personas to test role-scoped access.
            </p>

            <div className="space-y-2.5">
              {demoPersonaKeys.map((key) => {
                const persona = DEMO_PERSONAS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isSubmitting || authLoading}
                    onClick={() => handleQuickPersonaSelect(key)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-surface-container-high hover:border-primary/50 hover:bg-surface-container-lowest transition-all duration-200 group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                        style={{ backgroundColor: persona.colorHex }}
                      >
                        {persona.avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                          {persona.name}
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate">
                          {persona.department}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <RoleBadge role={persona.role} size="xs" variant="subtle" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security architecture callout */}
          <div className="p-4 rounded-lg bg-surface-container-low border border-surface-container-high text-[11px] text-on-surface-variant space-y-1">
            <span className="font-semibold text-on-surface block">Enterprise Access Control</span>
            Role-based permissions with instant revocation and tamper-evident audit logging.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

