import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { NotificationsList } from "@/components/notifications-list";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!hasSupabaseConfig()) redirect("/auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("id, display_name, programme, study_year, avatar_url, created_at").eq("id", user.id).maybeSingle();
  const typedProfile = profile as Profile | null;
  const displayName = typedProfile?.display_name ?? user.email?.split("@")[0] ?? "Étudiant";

  return (
    <div className="app-page">
      <AppHeader displayName={displayName} email={user.email ?? ""} userId={user.id} />
      <main id="main-content" className="content-wrap">
        <div className="page-header">
          <div>
            <span className="eyebrow"><Bell size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Notifications</span>
            <h1>Ne ratez pas les retours utiles.</h1>
            <p>Retrouvez les étudiants qui ont aimé ou commenté les ressources que vous avez partagées.</p>
          </div>
        </div>
        <NotificationsList userId={user.id} />
      </main>
    </div>
  );
}
