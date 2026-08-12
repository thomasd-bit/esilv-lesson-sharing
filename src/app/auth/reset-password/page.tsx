import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { PasswordResetForm } from "@/components/password-reset-form";
import { appConfig, hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!hasSupabaseConfig()) redirect("/auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return (
    <div className="app-page">
      <header className="app-header">
        <Link className="button button-quiet button-small" href="/auth"><ArrowLeft size={16} /> Retour à la connexion</Link>
        <span className="eyebrow">{appConfig.name}</span>
      </header>
      <main id="main-content" className="content-wrap password-reset-page">
        <div className="page-header">
          <div>
            <span className="eyebrow">Accès au compte</span>
            <h1>On repart sur de bonnes bases.</h1>
            <p>Votre lien de récupération est validé. Choisissez maintenant un nouveau mot de passe.</p>
          </div>
        </div>
        <PasswordResetForm email={user.email ?? ""} />
      </main>
    </div>
  );
}
