'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { StockSearchResult } from '@/src/types/stock';

const HISTORY_KEY = 'gb_stock_history';
const MAX_HISTORY  = 10;

export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<StockSearchResult[]>(HISTORY_KEY, []);

  const add = useCallback((item: StockSearchResult) => {
    setHistory(prev =>
      [item, ...prev.filter(r => r.symbol !== item.symbol)].slice(0, MAX_HISTORY),
    );
  }, [setHistory]);

  const remove = useCallback((symbol: string) => {
    setHistory(prev => prev.filter(r => r.symbol !== symbol));
  }, [setHistory]);

  return { history, add, remove };
}
