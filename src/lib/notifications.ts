export type NotificationFilter = "all" | "unread";

export function filterNotifications<T extends { read_at: string | null }>(notifications: T[], filter: NotificationFilter) {
  return filter === "unread"
    ? notifications.filter((notification) => !notification.read_at)
    : notifications;
}
