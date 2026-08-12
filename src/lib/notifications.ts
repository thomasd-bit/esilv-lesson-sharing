export type NotificationFilter = "all" | "unread";

export const NOTIFICATION_PAGE_SIZE = 30;

export function getNotificationRange(offset: number, pageSize = NOTIFICATION_PAGE_SIZE) {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  return { from: safeOffset, to: safeOffset + safePageSize - 1 };
}

export function getNotificationPageRange(page: number, pageSize = NOTIFICATION_PAGE_SIZE) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  return getNotificationRange((safePage - 1) * safePageSize, safePageSize);
}

export function getNotificationPageCount(total: number, pageSize = NOTIFICATION_PAGE_SIZE) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  return Math.max(1, Math.ceil(Math.max(0, total) / safePageSize));
}

export function notificationResourceLabel(title: string | null | undefined) {
  return title?.trim() || "une ressource devenue indisponible";
}

export function isNotificationUnread(readAt: string | null | undefined) {
  return !readAt;
}

export function filterNotifications<T extends { read_at: string | null }>(notifications: T[], filter: NotificationFilter) {
  return filter === "unread"
    ? notifications.filter((notification) => !notification.read_at)
    : notifications;
}
