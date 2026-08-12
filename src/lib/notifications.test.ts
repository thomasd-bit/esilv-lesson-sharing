import { describe, expect, it } from "vitest";
import { filterNotifications } from "@/lib/notifications";

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
});
