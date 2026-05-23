import type { SupabaseClient } from "@supabase/supabase-js";
import type { KAM } from "@/types";

// Resolves the authenticated user's KAM row, or null if unauthenticated /
// not yet provisioned. RLS lets a user read only their own kams row.
export async function getAuthedKam(supabase: SupabaseClient): Promise<KAM | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("kams")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as KAM) ?? null;
}
