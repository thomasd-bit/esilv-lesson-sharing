"use client";

import Link from "next/link";
import { Bell, CheckCheck, Heart, LoaderCircle, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDate, notificationMessage } from "@/lib/format";
import { filterNotifications, type NotificationFilter } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification, Profile } from "@/lib/types";

type NotificationView = AppNotification & {
  actor: Profile | null;
  resourceTitle: string;
};

const notificationSelect = "id, recipient_id, actor_id, resource_id, comment_id, type, created_at, read_at";

export function NotificationsList({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: notificationsError } = await supabase
        .from("notifications")
        .select(notificationSelect)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!active) return;
      if (notificationsError) {
        setError("Les notifications ne sont pas encore disponibles. Appliquez la migration Supabase 20260812010000_notifications.sql.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as AppNotification[];
      const actorIds = [...new Set(rows.map((notification) => notification.actor_id))];
      const resourceIds = [...new Set(rows.flatMap((notification) => notification.resource_id ? [notification.resource_id] : []))];
      const [{ data: profiles }, { data: resources }] = await Promise.all([
        actorIds.length
          ? supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", actorIds)
          : Promise.resolve({ data: [] }),
        resourceIds.length
          ? supabase.from("resources").select("id, title").in("id", resourceIds)
          : Promise.resolve({ data: [] }),
      ]);
      const profileById = new Map(((profiles ?? []) as unknown as Profile[]).map((profile) => [profile.id, profile]));
      const resourceById = new Map(((resources ?? []) as Array<{ id: string; title: string }>).map((resource) => [resource.id, resource.title]));

      if (!active) return;
      setNotifications(rows.map((notification) => ({
        ...notification,
        actor: profileById.get(notification.actor_id) ?? null,
        resourceTitle: resourceById.get(notification.resource_id ?? "") ?? "une ressource",
      })));
      setLoading(false);
    }

    void loadNotifications();
    return () => { active = false; };
  }, [userId]);

  async function markAsRead(id: string) {
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read_at: readAt } : notification));
    const { error: updateError } = await createClient().from("notifications").update({ read_at: readAt }).eq("id", id).eq("recipient_id", userId);
    if (updateError) {
      setError("La notification n’a pas pu être marquée comme lue.");
      return;
    }
    window.dispatchEvent(new Event("passerelle:notifications-changed"));
  }

  async function markAllAsRead() {
    if (!notifications.some((notification) => !notification.read_at) || working) return;
    setWorking(true);
    const readAt = new Date().toISOString();
    const { error: updateError } = await createClient()
      .from("notifications")
      .update({ read_at: readAt })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (updateError) {
      setError("Les notifications n’ont pas pu être marquées comme lues.");
    } else {
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? readAt })));
      window.dispatchEvent(new Event("passerelle:notifications-changed"));
    }
    setWorking(false);
  }

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  const visibleNotifications = useMemo(() => filterNotifications(notifications, filter), [filter, notifications]);

  if (loading) {
    return <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On regarde ce qui s’est passé.</h3><p>Les notifications arrivent.</p></div>;
  }

  if (error && notifications.length === 0) {
    return <div className="empty-state"><Bell size={25} /><h3>Les notifications sont indisponibles.</h3><p>{error}</p></div>;
  }

  return (
    <section className="notifications-panel" aria-labelledby="notifications-list-title">
      <div className="notifications-toolbar">
        <div>
          <span className="eyebrow">Votre activité</span>
          <h2 id="notifications-list-title">Les nouvelles de vos partages</h2>
        </div>
        <div className="notifications-toolbar-actions">
          <div className="notification-filters" role="group" aria-label="Filtrer les notifications">
            <button className={`notification-filter ${filter === "all" ? "notification-filter-active" : ""}`} onClick={() => setFilter("all")} type="button">Toutes <span>{notifications.length}</span></button>
            <button className={`notification-filter ${filter === "unread" ? "notification-filter-active" : ""}`} onClick={() => setFilter("unread")} type="button">Non lues <span>{unreadCount}</span></button>
          </div>
          <button className="button button-secondary button-small" disabled={unreadCount === 0 || working} onClick={() => void markAllAsRead()} type="button">
            {working ? <LoaderCircle className="spin" size={15} /> : <CheckCheck size={15} />} Tout marquer comme lu
          </button>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notifications.length === 0 ? (
        <div className="empty-state notifications-empty"><Bell size={25} /><h3>Rien de nouveau pour le moment.</h3><p>Quand un étudiant aimera ou commentera l’une de vos ressources, vous le verrez ici.</p><Link className="button button-coral" href="/resources/new">Partager une ressource</Link></div>
      ) : visibleNotifications.length === 0 ? (
        <div className="empty-state notifications-empty"><CheckCheck size={25} /><h3>Tout est lu.</h3><p>Aucune notification non lue pour le moment.</p><button className="button button-secondary" onClick={() => setFilter("all")} type="button">Voir toutes les notifications</button></div>
      ) : (
        <div className="notification-list">
          {visibleNotifications.map((notification) => {
            const unread = !notification.read_at;
            const href = notification.resource_id ? `/resources/${notification.resource_id}` : "/notifications";
            return (
              <article className={`notification-item ${unread ? "notification-item-unread" : ""}`} key={notification.id}>
                <span className={`notification-item-icon notification-item-icon-${notification.type}`} aria-hidden="true">
                  {notification.type === "like" ? <Heart size={17} fill="currentColor" /> : <MessageCircle size={17} />}
                </span>
                <div className="notification-item-body">
                  <Link className="notification-item-link" href={href} onClick={() => { if (unread) void markAsRead(notification.id); }}>
                    <strong>{notificationMessage(notification.type, notification.actor?.display_name ?? "", notification.resourceTitle)}</strong>
                    <time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time>
                  </Link>
                </div>
                {unread ? <button className="notification-read-button" onClick={() => void markAsRead(notification.id)} type="button">Marquer comme lu</button> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
