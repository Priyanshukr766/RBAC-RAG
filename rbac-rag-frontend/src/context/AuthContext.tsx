import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AllowedRole, AuthenticatedUser } from '../types/auth';
import { fetchCurrentUser, loginUser, registerUser } from '../api/authApi';
import { getStoredToken, setStoredToken } from '../api/axiosClient';

export type DemoPersonaKey =
  | 'priya_hr'
  | 'arjun_eng'
  | 'vikram_finance'
  | 'neha_intern'
  | 'system_admin';

export interface DemoPersona {
  key: DemoPersonaKey;
  name: string;
  email: string;
  role: AllowedRole;
  department: string;
  avatarText: string;
  colorHex: string;
}

export const DEMO_PERSONAS: Record<DemoPersonaKey, DemoPersona> = {
  priya_hr: {
    key: 'priya_hr',
    name: 'Priya Patel',
    email: 'priya.hr@company.com',
    role: 'hr',
    department: 'Human Resources',
    avatarText: 'PP',
    colorHex: '#e02626',
  },
  arjun_eng: {
    key: 'arjun_eng',
    name: 'Arjun Mehta',
    email: 'arjun.eng@company.com',
    role: 'engineering',
    department: 'Cloud Platform Eng',
    avatarText: 'AM',
    colorHex: '#1a73e0',
  },
  vikram_finance: {
    key: 'vikram_finance',
    name: 'Vikram Singhania',
    email: 'vikram.fin@company.com',
    role: 'finance',
    department: 'Financial Strategy',
    avatarText: 'VS',
    colorHex: '#9433d9',
  },
  neha_intern: {
    key: 'neha_intern',
    name: 'Neha Verma',
    email: 'neha.intern@company.com',
    role: 'intern',
    department: 'Product Operations',
    avatarText: 'NV',
    colorHex: '#d97706',
  },
  system_admin: {
    key: 'system_admin',
    name: 'System Administrator',
    email: 'admin@company.com',
    role: 'admin',
    department: 'Security & Access Control',
    avatarText: 'SA',
    colorHex: '#0f172a',
  },
};

const DEFAULT_DEMO_PASSWORD = 'DemoPass123!';

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  activePersonaKey: DemoPersonaKey | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshLiveRole: () => Promise<AuthenticatedUser | null>;
  switchDemoPersona: (personaKey: DemoPersonaKey) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePersonaKey, setActivePersonaKey] = useState<DemoPersonaKey | null>(null);

  const determinePersonaKeyFromEmail = (email: string): DemoPersonaKey | null => {
    for (const [key, p] of Object.entries(DEMO_PERSONAS)) {
      if (p.email.toLowerCase() === email.toLowerCase()) {
        return key as DemoPersonaKey;
      }
    }
    return null;
  };

  const refreshLiveRole = useCallback(async (): Promise<AuthenticatedUser | null> => {
    try {
      const liveUser = await fetchCurrentUser();
      setUser(liveUser);
      setActivePersonaKey(determinePersonaKeyFromEmail(liveUser.email));
      return liveUser;
    } catch {
      return null;
    }
  }, []);

  // Initial token validation & live role sync on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const existingToken = getStoredToken();
      if (existingToken) {
        try {
          const liveUser = await fetchCurrentUser();
          setUser(liveUser);
          setActivePersonaKey(determinePersonaKeyFromEmail(liveUser.email));
        } catch {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Global event listeners for token expiration & role revocation
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setActivePersonaKey(null);
    };

    const handleForbidden = async () => {
      // Role may have been changed in Redis; sync immediately
      await refreshLiveRole();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:forbidden', handleForbidden);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:forbidden', handleForbidden);
    };
  }, [refreshLiveRole]);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await loginUser(email, password);
      setToken(res.access_token);
      const liveUser = await fetchCurrentUser();
      setUser(liveUser);
      setActivePersonaKey(determinePersonaKeyFromEmail(email));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setActivePersonaKey(null);
  };

  const switchDemoPersona = async (personaKey: DemoPersonaKey): Promise<void> => {
    const persona = DEMO_PERSONAS[personaKey];
    if (!persona) return;

    setIsLoading(true);
    try {
      let res;
      try {
        res = await loginUser(persona.email, DEFAULT_DEMO_PASSWORD);
      } catch (loginErr: any) {
        // If user does not exist in a freshly seeded DB, register automatically
        if (loginErr?.response?.status === 401 || loginErr?.response?.status === 404) {
          res = await registerUser(
            persona.email,
            DEFAULT_DEMO_PASSWORD,
            persona.name,
            persona.role
          );
        } else {
          throw loginErr;
        }
      }

      setToken(res.access_token);
      const liveUser = await fetchCurrentUser();
      setUser(liveUser);
      setActivePersonaKey(personaKey);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activePersonaKey,
        login,
        logout,
        refreshLiveRole,
        switchDemoPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

