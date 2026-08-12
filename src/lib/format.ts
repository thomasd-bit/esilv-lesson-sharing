import type { NotificationType } from "@/lib/types";

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export function wasEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

export function notificationMessage(type: NotificationType, actorName: string, resourceTitle: string) {
  const actor = actorName.trim() || "Un étudiant";
  const title = resourceTitle.trim() || "une ressource";
  return type === "like"
    ? `${actor} a aimé « ${title} »`
    : `${actor} a commenté « ${title} »`;
}
