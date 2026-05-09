'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hydration-safe localStorage hook.
 *
 * - SSR: always starts with `initialValue` (no localStorage access on server)
 * - Client: reads stored value in useEffect after mount
 * - `options.shouldPersist`: when provided, a value is only written to localStorage
 *   if the predicate returns true. Stored values failing the predicate are also
 *   ignored on read (treated as if absent).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: { shouldPersist?: (value: T) => boolean },
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(initialValue);

  // Keep a ref to the latest predicate so setValue doesn't need it as a dep.
  const shouldPersistRef = useRef(options?.shouldPersist);
  useEffect(() => { shouldPersistRef.current = options?.shouldPersist; });

  // Read from localStorage after mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      const parsed = JSON.parse(raw) as T;
      const sp = shouldPersistRef.current;
      if (!sp || sp(parsed)) setStored(parsed);
    } catch {}
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored(prev => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        const sp = shouldPersistRef.current;
        if (!sp || sp(next)) {
          try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
        }
        return next;
      });
    },
    [key],
  );

  return [stored, setValue];
}
