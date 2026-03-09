const CACHE_PREFIX = 'kl_price_';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export function getCachedPrice<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Return even if stale — caller decides freshness
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedPrice<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full — ignore
  }
}

export function isCacheFresh(key: string): boolean {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return Date.now() - entry.ts < CACHE_TTL;
  } catch {
    return false;
  }
}
