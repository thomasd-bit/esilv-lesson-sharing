"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { appConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/format";

export function AppHeader({ displayName, email, userId }: { displayName: string; email: string; userId: string }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      const { count } = await createClient()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (active) setUnreadCount(count ?? 0);
    }

    void loadUnreadCount();
    const refreshOnChange = () => void loadUnreadCount();
    window.addEventListener("passerelle:notifications-changed", refreshOnChange);
    window.addEventListener("focus", refreshOnChange);
    return () => {
      active = false;
      window.removeEventListener("passerelle:notifications-changed", refreshOnChange);
      window.removeEventListener("focus", refreshOnChange);
    };
  }, [userId]);

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
        <Link href="/saved">Enregistrés</Link>
        <Link href="/profile">Mon profil</Link>
      </nav>
      <div className="header-actions">
        <Link className="notification-link" href="/notifications" aria-label={unreadCount ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}` : "Notifications"}>
          <Bell size={17} />
          <span className="notification-text">Notifications</span>
          {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </Link>
        <Link className="button button-coral button-small" href="/resources/new" aria-label="Partager une ressource">
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
