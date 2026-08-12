import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { Dashboard } from "@/components/dashboard";
import { hasSupabaseConfig } from "@/lib/config";
import { isMaintainerEmail } from "@/lib/moderation";
import { parseResourceFilters } from "@/lib/resources";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!hasSupabaseConfig()) {
    return <ConfigurationNotice />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, programme, study_year, bio, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const query = await searchParams;
  const filterParams = new URLSearchParams();
  for (const key of ["q", "kind", "year", "programme", "sort"]) {
    const value = query[key];
    if (typeof value === "string") filterParams.set(key, value);
  }

  return <Dashboard email={user.email ?? ""} profile={profile as Profile | null} userId={user.id} isMaintainer={isMaintainerEmail(user.email, process.env.MAINTAINER_EMAILS ?? "")} initialFilters={parseResourceFilters(filterParams)} />;
}
