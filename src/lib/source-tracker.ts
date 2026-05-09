// Module-level registry: tracks the last recorded health of each data source.
// Persists across requests in the same Node.js process (same as the cache Map).

export interface SourceRecord {
  sourceId: string;
  success: boolean;
  responseTimeMs: number;
  updatedAt: string;
  isStale: boolean;
  usedFallback: boolean;
  consecutiveFailureCount: number;
}

const registry = new Map<string, SourceRecord>();

export function recordSource(record: Omit<SourceRecord, 'consecutiveFailureCount'>): void {
  const prev = registry.get(record.sourceId);
  const consecutiveFailureCount = record.success
    ? 0
    : (prev?.consecutiveFailureCount ?? 0) + 1;

  registry.set(record.sourceId, { ...record, consecutiveFailureCount });
}

export function getAllRecords(): SourceRecord[] {
  return Array.from(registry.values());
}

export function getRecord(sourceId: string): SourceRecord | null {
  return registry.get(sourceId) ?? null;
}
