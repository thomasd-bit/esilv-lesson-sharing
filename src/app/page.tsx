import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { Dashboard } from "@/components/dashboard";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
    .select("id, display_name, programme, study_year, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return <Dashboard email={user.email ?? ""} profile={profile as Profile | null} />;
}
