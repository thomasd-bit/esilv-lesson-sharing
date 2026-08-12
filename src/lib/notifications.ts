export type NotificationFilter = "all" | "unread";

export function notificationResourceLabel(title: string | null | undefined) {
  return title?.trim() || "une ressource devenue indisponible";
}

export function filterNotifications<T extends { read_at: string | null }>(notifications: T[], filter: NotificationFilter) {
  return filter === "unread"
    ? notifications.filter((notification) => !notification.read_at)
    : notifications;
}
