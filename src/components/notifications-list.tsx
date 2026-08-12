"use client";

import Link from "next/link";
import { Bell, CheckCheck, Heart, LoaderCircle, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatMetric, notificationMessage } from "@/lib/format";
import { filterNotifications, getNotificationRange, notificationResourceLabel, NOTIFICATION_PAGE_SIZE, type NotificationFilter } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification, Profile } from "@/lib/types";

type NotificationView = AppNotification & {
  actor: Profile | null;
  resourceTitle: string | null;
};

type NotificationPage = {
  notifications: NotificationView[];
  totalCount: number | null;
  unreadCount: number | null;
  nextOffset: number;
  hasMore: boolean;
};

const notificationSelect = "id, recipient_id, actor_id, resource_id, comment_id, type, created_at, read_at";

export function NotificationsList({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(async (offset: number): Promise<NotificationPage> => {
    const supabase = createClient();
    const range = getNotificationRange(offset);
    let pageQuery = supabase
      .from("notifications")
      .select(notificationSelect, { count: "exact" })
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false });
    if (filter === "unread") pageQuery = pageQuery.is("read_at", null);
    pageQuery = pageQuery.range(range.from, range.to);

    const [pageResult, totalCountResult, unreadCountResult] = await Promise.all([
      pageQuery,
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null),
    ]);

    if (pageResult.error) throw pageResult.error;

    const rows = (pageResult.data ?? []) as AppNotification[];
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
    const enrichedNotifications = rows.map((notification) => ({
      ...notification,
      actor: profileById.get(notification.actor_id) ?? null,
      resourceTitle: resourceById.get(notification.resource_id ?? "") ?? null,
    }));
    const pageCount = pageResult.count;

    return {
      notifications: enrichedNotifications,
      totalCount: totalCountResult.error ? null : totalCountResult.count ?? 0,
      unreadCount: unreadCountResult.error ? null : unreadCountResult.count ?? 0,
      nextOffset: offset + enrichedNotifications.length,
      hasMore: pageCount === null
        ? enrichedNotifications.length >= NOTIFICATION_PAGE_SIZE
        : offset + enrichedNotifications.length < pageCount,
    };
  }, [filter, userId]);

  useEffect(() => {
    let active = true;
    const requestId = ++requestIdRef.current;

    async function refreshNotifications() {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      setNotifications([]);
      setTotalCount(null);
      setUnreadCount(null);
      setNextOffset(0);
      setHasMore(false);
      try {
        const result = await loadPage(0);
        if (!active || requestId !== requestIdRef.current) return;
        setNotifications(result.notifications);
        setTotalCount(result.totalCount);
        setUnreadCount(result.unreadCount);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch {
        if (active && requestId === requestIdRef.current) setError("Les notifications ne sont pas encore disponibles. Appliquez la migration Supabase 20260812010000_notifications.sql.");
      } finally {
        if (active && requestId === requestIdRef.current) setLoading(false);
      }
    }

    void refreshNotifications();

    return () => { active = false; };
  }, [loadPage]);

  async function loadMoreNotifications() {
    if (loading || loadingMore || !hasMore) return;
    const requestId = requestIdRef.current;
    const offset = nextOffset;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await loadPage(offset);
      if (requestId !== requestIdRef.current) return;
      setNotifications((current) => [...current, ...result.notifications]);
      setTotalCount(result.totalCount);
      setUnreadCount(result.unreadCount);
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch {
      if (requestId === requestIdRef.current) setError("Les notifications supplémentaires ne peuvent pas être chargées.");
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }

  async function markAsRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);
    const wasUnread = Boolean(target && !target.read_at);
    const previousNotifications = notifications;
    const readAt = new Date().toISOString();
    if (filter === "unread" && wasUnread) {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
      setNextOffset((current) => Math.max(0, current - 1));
    } else {
      setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read_at: readAt } : notification));
    }
    if (wasUnread) setUnreadCount((current) => current === null ? null : Math.max(0, current - 1));

    const { error: updateError } = await createClient().from("notifications").update({ read_at: readAt }).eq("id", id).eq("recipient_id", userId);
    if (updateError) {
      setNotifications(previousNotifications);
      if (filter === "unread" && wasUnread) setNextOffset((current) => current + 1);
      if (wasUnread) setUnreadCount((current) => current === null ? null : current + 1);
      setError("La notification n’a pas pu être marquée comme lue.");
      return;
    }
    window.dispatchEvent(new Event("passerelle:notifications-changed"));
  }

  async function markAllAsRead() {
    const unreadTotal = unreadCount ?? notifications.filter((notification) => !notification.read_at).length;
    if (unreadTotal === 0 || working) return;
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
      if (filter === "unread") {
        setNotifications([]);
        setNextOffset(0);
        setHasMore(false);
      } else {
        setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? readAt })));
      }
      setUnreadCount(0);
      window.dispatchEvent(new Event("passerelle:notifications-changed"));
    }
    setWorking(false);
  }

  const loadedUnreadCount = notifications.filter((notification) => !notification.read_at).length;
  const exactUnreadCount = unreadCount ?? loadedUnreadCount;
  const exactTotalCount = totalCount ?? notifications.length;
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
            <button className={`notification-filter ${filter === "all" ? "notification-filter-active" : ""}`} onClick={() => setFilter("all")} type="button">Toutes <span>{formatMetric(exactTotalCount)}</span></button>
            <button className={`notification-filter ${filter === "unread" ? "notification-filter-active" : ""}`} onClick={() => setFilter("unread")} type="button">Non lues <span>{formatMetric(exactUnreadCount)}</span></button>
          </div>
          <button className="button button-secondary button-small" disabled={exactUnreadCount === 0 || working} onClick={() => void markAllAsRead()} type="button">
            {working ? <LoaderCircle className="spin" size={15} /> : <CheckCheck size={15} />} Tout marquer comme lu
          </button>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notifications.length === 0 && filter === "all" ? (
        <div className="empty-state notifications-empty"><Bell size={25} /><h3>Rien de nouveau pour le moment.</h3><p>Quand un étudiant aimera ou commentera l’une de vos ressources, vous le verrez ici.</p><Link className="button button-coral" href="/resources/new">Partager une ressource</Link></div>
      ) : visibleNotifications.length === 0 ? (
        <div className="empty-state notifications-empty"><CheckCheck size={25} /><h3>Tout est lu.</h3><p>Aucune notification non lue pour le moment.</p><button className="button button-secondary" onClick={() => setFilter("all")} type="button">Voir toutes les notifications</button></div>
      ) : (
        <>
          <div className="notification-list">
            {visibleNotifications.map((notification) => {
              const unread = !notification.read_at;
              const resourceAvailable = Boolean(notification.resourceTitle);
              const resourceHref = resourceAvailable && notification.resource_id ? `/resources/${notification.resource_id}` : null;
              const resourceLabel = notificationResourceLabel(notification.resourceTitle);
              const content = <><strong>{notificationMessage(notification.type, notification.actor?.display_name ?? "", resourceLabel)}</strong><time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time></>;
              return (
                <article className={`notification-item ${unread ? "notification-item-unread" : ""}`} key={notification.id}>
                  <span className={`notification-item-icon notification-item-icon-${notification.type}`} aria-hidden="true">
                    {notification.type === "like" ? <Heart size={17} fill="currentColor" /> : <MessageCircle size={17} />}
                  </span>
                  <div className="notification-item-body">
                    {resourceHref ? <Link className="notification-item-link" href={resourceHref} onClick={() => { if (unread) void markAsRead(notification.id); }}>{content}</Link> : <span className="notification-item-content">{content}</span>}
                  </div>
                  {unread ? <button className="notification-read-button" onClick={() => void markAsRead(notification.id)} type="button">Marquer comme lu</button> : null}
                </article>
              );
            })}
          </div>
          {hasMore ? <div className="load-more-wrap"><button className="button button-secondary" disabled={loadingMore} onClick={() => void loadMoreNotifications()} type="button">{loadingMore ? <LoaderCircle className="spin" size={16} /> : null}{loadingMore ? "Chargement…" : `Charger les ${NOTIFICATION_PAGE_SIZE} suivantes`}</button><p className="field-hint">Les notifications plus anciennes restent disponibles en continuant le chargement.</p></div> : null}
        </>
      )}
    </section>
  );
}
