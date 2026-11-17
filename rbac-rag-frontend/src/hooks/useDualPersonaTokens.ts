import { useState, useEffect, useCallback } from 'react';
import { DEMO_PERSONAS, DemoPersona, DemoPersonaKey } from '../context/AuthContext';
import { loginUser, registerUser } from '../api/authApi';

export interface DualPersonaTokensState {
  leftPersonaKey: DemoPersonaKey;
  rightPersonaKey: DemoPersonaKey;
  leftToken: string | null;
  rightToken: string | null;
  leftPersona: DemoPersona;
  rightPersona: DemoPersona;
  isLoading: boolean;
  error: string | null;
  setLeftPersonaKey: (key: DemoPersonaKey) => void;
  setRightPersonaKey: (key: DemoPersonaKey) => void;
  refreshTokens: () => Promise<void>;
}

const DEFAULT_DEMO_PASSWORD = 'DemoPass123!';

export function useDualPersonaTokens(): DualPersonaTokensState {
  const [leftPersonaKey, setLeftPersonaKey] = useState<DemoPersonaKey>('priya_hr');
  const [rightPersonaKey, setRightPersonaKey] = useState<DemoPersonaKey>('arjun_eng');

  const [leftToken, setLeftToken] = useState<string | null>(null);
  const [rightToken, setRightToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const acquireToken = async (key: DemoPersonaKey): Promise<string> => {
    const persona = DEMO_PERSONAS[key];
    try {
      const res = await loginUser(persona.email, DEFAULT_DEMO_PASSWORD, false);
      return res.access_token;
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 404) {
        // Auto-register demo persona if not yet in fresh DB
        const regRes = await registerUser(
          persona.email,
          DEFAULT_DEMO_PASSWORD,
          persona.name
        );
        return regRes.access_token;
      }
      throw err;
    }
  };

  const refreshTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tokLeft, tokRight] = await Promise.all([
        acquireToken(leftPersonaKey),
        acquireToken(rightPersonaKey),
      ]);
      setLeftToken(tokLeft);
      setRightToken(tokRight);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to authenticate dual comparison personas.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [leftPersonaKey, rightPersonaKey]);

  useEffect(() => {
    refreshTokens();
  }, [refreshTokens]);

  return {
    leftPersonaKey,
    rightPersonaKey,
    leftToken,
    rightToken,
    leftPersona: DEMO_PERSONAS[leftPersonaKey],
    rightPersona: DEMO_PERSONAS[rightPersonaKey],
    isLoading,
    error,
    setLeftPersonaKey,
    setRightPersonaKey,
    refreshTokens,
  };
}

export default useDualPersonaTokens;

