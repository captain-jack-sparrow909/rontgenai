import type { StoredObject } from "@/platform/types";

/**
 * Vendor-swappable object storage.
 * v1: Cloudflare R2 (S3-compatible) · later: AWS S3.
 */
export interface ObjectStore {
  readonly name: string;
  put(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<StoredObject>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Stub used until R2 credentials are configured.
 * Replace with S3Client-backed R2ObjectStore in Phase 1 services.
 */
export class InMemoryObjectStore implements ObjectStore {
  readonly name = "memory";
  private readonly store = new Map<string, { body: Buffer; contentType?: string }>();

  async put(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<StoredObject> {
    const buf = typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
    this.store.set(key, { body: buf, contentType });
    return { key, contentType, size: buf.length };
  }

  async getSignedUrl(key: string): Promise<string> {
    if (!this.store.has(key)) throw new Error(`Object not found: ${key}`);
    return `memory://${key}`;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class R2ObjectStore implements ObjectStore {
  readonly name = "r2";

  constructor(
    private readonly config = {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    },
  ) {}

  private assertConfigured() {
    const { accountId, accessKeyId, secretAccessKey, bucket } = this.config;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.",
      );
    }
  }

  async put(): Promise<StoredObject> {
    this.assertConfigured();
    // Phase 1: implement with @aws-sdk/client-s3 against R2 endpoint.
    throw new Error("R2ObjectStore.put not implemented in web Phase 0 — use API service");
  }

  async getSignedUrl(): Promise<string> {
    this.assertConfigured();
    throw new Error("R2ObjectStore.getSignedUrl not implemented in web Phase 0");
  }

  async delete(): Promise<void> {
    this.assertConfigured();
    throw new Error("R2ObjectStore.delete not implemented in web Phase 0");
  }
}

export function getObjectStore(): ObjectStore {
  if (process.env.R2_BUCKET) {
    return new R2ObjectStore();
  }
  return new InMemoryObjectStore();
}
