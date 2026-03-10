interface CacheEntry<T> {
  data: T
  expiry: number
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiry: Date.now() + ttlMs })
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }
}

export const cache = new TTLCache()

// TTL constants
export const TTL = {
  SP500_LIST: 24 * 60 * 60 * 1000,   // 24 hours
  NEWS: 15 * 60 * 1000,               // 15 minutes
  FINVIZ_METRICS: 60 * 60 * 1000,     // 1 hour
}
