"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { appConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/format";

export function AppHeader({ displayName, email }: { displayName: string; email: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return (
    <header className="app-header">
      <Link className="brand-lockup" href="/" aria-label="Retour à l’accueil">
        <span className="brand-mark brand-mark-small">P</span>
        <span>{appConfig.name}</span>
      </Link>
      <nav className="header-nav" aria-label="Navigation principale">
        <Link href="/">Ressources</Link>
        <Link href="/profile">Mon profil</Link>
      </nav>
      <div className="header-actions">
        <Link className="button button-coral button-small" href="/resources/new">
          <Plus size={16} />
          <span>Partager</span>
        </Link>
        <span className="user-chip" title={email}>
          <span className="avatar">{initials(displayName)}</span>
          <span>{displayName}</span>
        </span>
        <button className="button button-quiet button-small" onClick={() => void signOut()} type="button" aria-label="Se déconnecter">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

