import { Settings2 } from "lucide-react";

export function ConfigurationNotice() {
  return (
    <main className="page-center page-padding">
      <section className="message-card message-card-wide">
        <div className="icon-badge icon-badge-blue" aria-hidden="true">
          <Settings2 size={22} />
        </div>
        <span className="eyebrow">Configuration locale</span>
        <h1>Passerelle est prête à démarrer.</h1>
        <p>
          Ajoutez les deux variables Supabase dans <code>.env.local</code>, puis relancez le serveur de développement.
          Le schéma complet de la base se trouve dans <code>supabase/migrations</code>.
        </p>
        <div className="setup-list">
          <code>NEXT_PUBLIC_SUPABASE_URL</code>
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
        </div>
      </section>
    </main>
  );
}

