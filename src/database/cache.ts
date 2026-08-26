type CacheItem<T> = {
  value: T;
  expiresAt: number;
  namespace?: string;
};

export class DatabaseCache<T> {
  // main storage
  private cache = new Map<string, CacheItem<T>>();

  // tracks ongoing requests to prevent duplicates
  private pendingFetches = new Map<string, Promise<T>>();

  // groups keys by a namespace for quick wipes
  private namespaces = new Map<string, Set<string>>();

  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 5000, ttlMilliseconds: number = 600000) {
    this.maxSize = maxSize;
    this.ttl = ttlMilliseconds;
  }

  public get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // drop it if it expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // bump to the back so it stays alive
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  public set(key: string, value: T, namespace?: string): void {
    // clear old one to reset its position
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // drop the oldest item if we hit the limit
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) this.delete(lruKey);
    }

    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl, namespace });

    // track the namespace if provided
    if (namespace) {
      let nsSet = this.namespaces.get(namespace);
      if (!nsSet) {
        nsSet = new Set<string>();
        this.namespaces.set(namespace, nsSet);
      }
      nsSet.add(key);
    }
  }

  public async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    namespace?: string,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const pending = this.pendingFetches.get(key);
    if (pending) return pending;

    const fetchPromise = fetcher()
      .then((value) => {
        this.set(key, value, namespace);
        this.pendingFetches.delete(key);
        return value;
      })
      .catch((error) => {
        this.pendingFetches.delete(key);
        throw error;
      });

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  public getByNamespace(namespace: string): { key: string; value: T }[] {
    const nsSet = this.namespaces.get(namespace);
    if (!nsSet) return [];

    const results: { key: string; value: T }[] = [];

    for (const key of nsSet) {
      const val = this.get(key);
      if (val !== undefined) {
        results.push({ key, value: val });
      }
    }
    return results;
  }

  public deleteByNamespace(namespace: string): void {
    const nsSet = this.namespaces.get(namespace);
    if (!nsSet) return;

    for (const key of nsSet) {
      this.cache.delete(key);
    }
    this.namespaces.delete(namespace);
  }

  private cleanExpiredDuringIteration(expiredKeys: string[]) {
    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  public getStartsWith(prefix: string): { key: string; value: T }[] {
    const results: { key: string; value: T }[] = [];
    const expiredKeys: string[] = [];
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        if (now > item.expiresAt) {
          expiredKeys.push(key);
        } else {
          results.push({ key, value: item.value });
        }
      }
    }

    this.cleanExpiredDuringIteration(expiredKeys);
    return results;
  }

  public delete(key: string): void {
    const item = this.cache.get(key);
    if (!item) return;

    // clean up from the namespace group
    if (item.namespace) {
      const nsSet = this.namespaces.get(item.namespace);
      if (nsSet) {
        nsSet.delete(key);
        if (nsSet.size === 0) this.namespaces.delete(item.namespace);
      }
    }

    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.namespaces.clear();
    this.pendingFetches.clear();
  }

  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  public extendTTL(key: string, extraMilliseconds?: number): boolean {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }

    item.expiresAt = extraMilliseconds
      ? item.expiresAt + extraMilliseconds
      : Date.now() + this.ttl;

    return true;
  }

  public getSize(): number {
    return this.cache.size;
  }

  // --- memory helpers ---

  // proactively clears out expired items to free up ram immediately.
  public sweep(): number {
    const expiredKeys: string[] = [];
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }

    this.cleanExpiredDuringIteration(expiredKeys);
    return expiredKeys.length; // returns how many items were garbage collected
  }

  // forces the cache down to a specific size by dropping the oldest items.
  public trim(targetSize: number = Math.floor(this.maxSize * 0.8)): number {
    if (this.cache.size <= targetSize) return 0;

    let removed = 0;
    while (this.cache.size > targetSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.delete(oldestKey);
        removed++;
      } else {
        break;
      }
    }

    return removed;
  }
}
