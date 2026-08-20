export class DatabaseCache<T> {
  // holds the actual cached data with an expiration timestamp
  private cache = new Map<string, { value: T; expiresAt: number }>();

  // keeps track of ongoing fetch requests to prevent duplicate database calls
  private pendingFetches = new Map<string, Promise<T>>();

  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttlMilliseconds: number = 600000) {
    this.maxSize = maxSize;
    this.ttl = ttlMilliseconds;
  }

  // --- BASIC READ / WRITE ---

  public get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // quietly remove the item if it has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  public set(key: string, value: T): void {
    // if we hit the limit, delete the oldest item (the first key in the map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
  }

  // safely get a value, or fetch it asynchronously without duplicating requests
  public async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    // if someone else is already fetching this exact key, wait for their result
    const pending = this.pendingFetches.get(key);
    if (pending) return pending;

    // start a new fetch request
    const fetchPromise = fetcher()
      .then((value) => {
        this.set(key, value);
        this.pendingFetches.delete(key);
        return value;
      })
      .catch((error) => {
        // clean up on failure so we can safely try again later
        this.pendingFetches.delete(key);
        throw error;
      });

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  // --- ADVANCED FETCHING ---

  // fetch multiple exact keys at once
  public getMultiple(keys: string[]): { key: string; value: T }[] {
    const results: { key: string; value: T }[] = [];
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) results.push({ key, value });
    }
    return results;
  }

  // fetch all items where the key starts with a specific string
  public getStartsWith(prefix: string): { key: string; value: T }[] {
    const results: { key: string; value: T }[] = [];
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        } else {
          results.push({ key, value: item.value });
        }
      }
    }
    return results;
  }

  // fetch all items where the key ends with a specific string
  public getEndsWith(suffix: string): { key: string; value: T }[] {
    const results: { key: string; value: T }[] = [];
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (key.endsWith(suffix)) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        } else {
          results.push({ key, value: item.value });
        }
      }
    }
    return results;
  }

  // fuzzy search: fetch all items where the key includes a specific string
  public fuzzyGet(
    query: string,
    caseSensitive: boolean = false,
  ): { key: string; value: T }[] {
    const results: { key: string; value: T }[] = [];
    const now = Date.now();
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (const [key, item] of this.cache.entries()) {
      const targetKey = caseSensitive ? key : key.toLowerCase();

      if (targetKey.includes(searchQuery)) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        } else {
          results.push({ key, value: item.value });
        }
      }
    }
    return results;
  }

  // grab absolutely everything currently valid in the cache
  public getAll(): { key: string; value: T }[] {
    const results: { key: string; value: T }[] = [];
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      } else {
        results.push({ key, value: item.value });
      }
    }
    return results;
  }

  // --- DELETION ---

  // delete a specific, exact key
  public delete(key: string): void {
    this.cache.delete(key);
  }

  // delete all keys that start with a specific string
  public deleteStartsWith(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  // delete all keys that end with a specific string
  public deleteEndsWith(suffix: string): void {
    for (const key of this.cache.keys()) {
      if (key.endsWith(suffix)) this.cache.delete(key);
    }
  }

  // fuzzy delete: delete all keys that contain a specific string
  public fuzzyDelete(query: string, caseSensitive: boolean = false): void {
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (const key of this.cache.keys()) {
      const targetKey = caseSensitive ? key : key.toLowerCase();
      if (targetKey.includes(searchQuery)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
    this.pendingFetches.clear();
  }

  // --- UTILITIES ---

  // check if a key exists without resetting its ttl or triggering a fetch
  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  // extend the life of an item in the cache (defaults to resetting it back to max ttl)
  public extendTTL(key: string, extraMilliseconds?: number): boolean {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    item.expiresAt = extraMilliseconds
      ? item.expiresAt + extraMilliseconds
      : Date.now() + this.ttl;

    return true;
  }

  // see how many items are currently stored
  public getSize(): number {
    return this.cache.size;
  }
}
