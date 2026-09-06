'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'qimen-api-key';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setApiKeyState(saved);
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    apiKey,
    setApiKey,
    isValid: apiKey.startsWith('sk-ant-'),
  };
}
