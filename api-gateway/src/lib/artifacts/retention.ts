import { deleteObject, isR2Configured } from "../r2.js";
import { getSupabase } from "../supabase.js";

export async function purgeExpiredArtifacts(limit = 100): Promise<{
  inspected: number;
  deleted: number;
  failed: number;
}> {
  if (!isR2Configured()) return { inspected: 0, deleted: 0, failed: 0 };
  const sb = getSupabase();
  const { data, error } = await sb
    .from("artifacts")
    .select("id,r2_key")
    .lte("expires_at", new Date().toISOString())
    .is("deleted_at", null)
    .limit(limit);
  if (error) throw new Error(`artifact retention query failed: ${error.message}`);

  let deleted = 0;
  let failed = 0;
  for (const artifact of data ?? []) {
    try {
      await deleteObject(artifact.r2_key);
      await sb
        .from("artifacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", artifact.id);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { inspected: data?.length ?? 0, deleted, failed };
}
