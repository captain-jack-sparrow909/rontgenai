import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import { randomUUID } from "node:crypto";

function r2Endpoint(): string {
  if (env.R2_S3_API_ENDPOINT) return env.R2_S3_API_ENDPOINT;
  if (env.R2_ACCOUNT_ID) {
    return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  throw new Error("R2 endpoint not configured");
}

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      (env.R2_S3_API_ENDPOINT || env.R2_ACCOUNT_ID),
  );
}

function client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint(),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function putObject(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ key: string; bucket: string }> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }

  await client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );

  return { key: opts.key, bucket: env.R2_BUCKET! };
}

export async function getSignedGetUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }

  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: key,
    }),
    { expiresIn: expiresInSeconds },
  );
}

export function blueprintObjectKey(
  profileId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `blueprint/${profileId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
}

export function pulseObjectKey(profileId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `pulse/${profileId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
}
