import { STORAGE_KEY } from './constants';

export function safeGetStorage(key: string): any {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function safeSetStorage(key: string, value: unknown): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

export function saveToStorage(partial: Record<string, unknown>): void {
  safeSetStorage(STORAGE_KEY, { ...(safeGetStorage(STORAGE_KEY) || {}), ...partial });
}

export function loadStoredConfig(): any {
  return safeGetStorage(STORAGE_KEY) || {};
}
