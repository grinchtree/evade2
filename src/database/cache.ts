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

  // safely get a value, or fetch it asynchronously without duplicating requests
  public async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    // check if we already have it in the cache
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

    // store the promise so other simultaneous requests can hook into it
    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  public set(key: string, value: T): void {
    // if we hit the limit, delete the oldest item (the first key in the map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.pendingFetches.clear();
  }
}
