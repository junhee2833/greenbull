'use client';

import { useState, useEffect, useRef } from 'react';

export interface SummaryData {
  headline: string;
  regimeSummary: string;
  keyDrivers: string;
  marketImplication: string;
  caution: string;
}

export type SummaryStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseSummaryOptions {
  type: 'liquidity' | 'sentiment';
  data: Record<string, any>;
}

export function useSummary({ type, data }: UseSummaryOptions) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [status, setStatus] = useState<SummaryStatus>('idle');

  // data is a useMemo result — stable reference per unique primitive set
  useEffect(() => {
    const controller = new AbortController();

    setStatus('loading');
    setSummary(null);

    fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SummaryData>;
      })
      .then((json) => {
        setSummary(json);
        setStatus('success');
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setStatus('error');
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, data]);

  return { summary, status };
}
