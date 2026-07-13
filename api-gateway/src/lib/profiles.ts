import {
  getSupabase,
  type Profile,
  type Subscription,
} from "./supabase.js";

export type EnsureProfileInput = {
  clerkUserId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export async function ensureProfile(
  input: EnsureProfileInput,
): Promise<{ profile: Profile; subscription: Subscription }> {
  const sb = getSupabase();

  const { data: existing, error: findErr } = await sb
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", input.clerkUserId)
    .maybeSingle();

  if (findErr) {
    throw new Error(`profiles lookup failed: ${findErr.message}`);
  }

  let profile: Profile;

  if (existing) {
    const { data: updated, error: updateErr } = await sb
      .from("profiles")
      .update({
        email: input.email ?? existing.email,
        full_name: input.fullName ?? existing.full_name,
        avatar_url: input.avatarUrl ?? existing.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateErr) {
      throw new Error(`profiles update failed: ${updateErr.message}`);
    }
    profile = updated as Profile;
  } else {
    const { data: created, error: createErr } = await sb
      .from("profiles")
      .insert({
        clerk_user_id: input.clerkUserId,
        email: input.email ?? null,
        full_name: input.fullName ?? null,
        avatar_url: input.avatarUrl ?? null,
      })
      .select("*")
      .single();

    if (createErr) {
      throw new Error(`profiles create failed: ${createErr.message}`);
    }
    profile = created as Profile;

    const { error: subErr } = await sb.from("subscriptions").insert({
      profile_id: profile.id,
      plan: "free",
      status: "active",
      provider: "paddle",
    });

    if (subErr) {
      // Race: another request may have created free sub
      console.warn("subscription seed:", subErr.message);
    }
  }

  const { data: sub, error: subFindErr } = await sb
    .from("subscriptions")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subFindErr) {
    throw new Error(`subscription lookup failed: ${subFindErr.message}`);
  }

  if (!sub) {
    const { data: seeded, error: seedErr } = await sb
      .from("subscriptions")
      .insert({
        profile_id: profile.id,
        plan: "free",
        status: "active",
        provider: "paddle",
      })
      .select("*")
      .single();

    if (seedErr) {
      throw new Error(`subscription seed failed: ${seedErr.message}`);
    }
    return { profile, subscription: seeded as Subscription };
  }

  return { profile, subscription: sub as Subscription };
}
