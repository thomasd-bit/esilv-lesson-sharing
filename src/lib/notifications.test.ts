import { describe, expect, it } from "vitest";
import { filterNotifications, getNotificationPageCount, getNotificationPageRange, getNotificationRange, isNotificationUnread, notificationResourceLabel, NOTIFICATION_PAGE_SIZE } from "@/lib/notifications";

describe("filtre des notifications", () => {
  const notifications = [
    { id: "read", read_at: "2026-08-12T10:00:00.000Z" },
    { id: "unread-a", read_at: null },
    { id: "unread-b", read_at: null },
  ];

  it("conserve toutes les notifications dans la vue complète", () => {
    expect(filterNotifications(notifications, "all")).toEqual(notifications);
  });

  it("isole les notifications non lues", () => {
    expect(filterNotifications(notifications, "unread").map((notification) => notification.id)).toEqual(["unread-a", "unread-b"]);
  });

  it("signale quand la ressource d’une notification n’est plus accessible", () => {
    expect(notificationResourceLabel("Fiche de calcul")).toBe("Fiche de calcul");
    expect(notificationResourceLabel(null)).toBe("une ressource devenue indisponible");
  });

  it("identifie une notification non lue sans dépendre de son affichage", () => {
    expect(isNotificationUnread(null)).toBe(true);
    expect(isNotificationUnread(undefined)).toBe(true);
    expect(isNotificationUnread("2026-08-12T10:00:00.000Z")).toBe(false);
  });

  it("calcule des pages de notifications sans recouvrir la page précédente", () => {
    expect(getNotificationPageRange(1)).toEqual({ from: 0, to: NOTIFICATION_PAGE_SIZE - 1 });
    expect(getNotificationPageRange(2, 30)).toEqual({ from: 30, to: 59 });
    expect(getNotificationRange(31, 30)).toEqual({ from: 31, to: 60 });
    expect(getNotificationPageCount(0, 30)).toBe(1);
    expect(getNotificationPageCount(61, 30)).toBe(3);
  });
});
