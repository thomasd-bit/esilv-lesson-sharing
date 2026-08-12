import type { ResourceReportStatus } from "@/lib/types";

export type ResourceVisibility = "published" | "hidden";

export const REPORT_PAGE_SIZE = 50;

export const REPORT_STATUS_LABELS: Record<ResourceReportStatus, string> = {
  open: "À traiter",
  reviewed: "Traité",
  closed: "Fermé",
};

export const RESOURCE_VISIBILITY_LABELS: Record<ResourceVisibility, string> = {
  published: "publiée",
  hidden: "masquée",
};

export function parseMaintainerEmails(raw: string) {
  return [...new Set(raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean))];
}

export function isMaintainerEmail(email: string | null | undefined, configuredEmails: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && parseMaintainerEmails(configuredEmails).includes(normalizedEmail));
}

export function isReportStatus(value: string): value is ResourceReportStatus {
  return value === "open" || value === "reviewed" || value === "closed";
}

export function isResourceVisibility(value: string): value is ResourceVisibility {
  return value === "published" || value === "hidden";
}

export function latestModerationEvents<T extends { resource_id: string; created_at: string }>(events: T[]) {
  const latestByResource = new Map<string, T>();
  for (const event of events) {
    const current = latestByResource.get(event.resource_id);
    if (!current || event.created_at > current.created_at) latestByResource.set(event.resource_id, event);
  }
  return latestByResource;
}

export function getReportPageRange(page: number, pageSize = REPORT_PAGE_SIZE) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safePageSize;
  return { from, to: from + safePageSize - 1 };
}

export function getReportPageCount(total: number, pageSize = REPORT_PAGE_SIZE) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  return Math.max(1, Math.ceil(Math.max(0, total) / safePageSize));
}

export function hasModerationConfig() {
  return parseMaintainerEmails(process.env.MAINTAINER_EMAILS ?? "").length > 0 && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
