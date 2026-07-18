/**
 * Vendor-swappable cache / rate-limit store.
 * v1: Upstash Redis · later: ElastiCache.
 */
export interface CacheStore {
  readonly name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  incr(key: string): Promise<number>;
}

export class MemoryCacheStore implements CacheStore {
  readonly name = "memory";
  private readonly map = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.map.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? "0") + 1;
    await this.set(key, String(current));
    return current;
  }
}

export class UpstashCacheStore implements CacheStore {
  readonly name = "upstash";
  private client: Redis | null = null;

  constructor(
    private readonly url = process.env.UPSTASH_REDIS_REST_URL,
    private readonly token = process.env.UPSTASH_REDIS_REST_TOKEN,
  ) {}

  private getClient(): Redis {
    if (!this.url || !this.token) {
      throw new Error("Upstash Redis is not configured");
    }
    if (!this.client) this.client = new Redis({ url: this.url, token: this.token });
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get<string>(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.getClient().set(key, value, { ex: ttlSeconds });
    } else {
      await this.getClient().set(key, value);
    }
  }

  async incr(key: string): Promise<number> {
    return this.getClient().incr(key);
  }
}

let store: CacheStore | null = null;

export function getCacheStore(): CacheStore {
  if (!store) {
    store = process.env.UPSTASH_REDIS_REST_URL
      ? new UpstashCacheStore()
      : new MemoryCacheStore();
  }
  return store;
}
import { Redis } from "@upstash/redis";
