'use client';

import { useState, useEffect } from 'react';
import type { AiProvider } from './useInterpretation';

const STORAGE_KEYS: Record<AiProvider, string> = {
  gemini: 'qimen-gemini-key',
  anthropic: 'qimen-api-key',
};

export function useApiKey(provider: AiProvider) {
  const [token, setTokenState] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS[provider]);
    if (saved) setTokenState(saved);
    else setTokenState('');
  }, [provider]);

  const setToken = (key: string) => {
    setTokenState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEYS[provider], key);
    } else {
      localStorage.removeItem(STORAGE_KEYS[provider]);
    }
  };

  const isValid = provider === 'anthropic'
    ? token.startsWith('sk-ant-')
    : token.length > 20;

  return { token, setToken, isValid };
}
