import type { ResourceReportStatus } from "@/lib/types";

export type ResourceVisibility = "published" | "hidden";

export const REPORT_STATUS_LABELS: Record<ResourceReportStatus, string> = {
  open: "À traiter",
  reviewed: "Traité",
  closed: "Fermé",
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

export function hasModerationConfig() {
  return parseMaintainerEmails(process.env.MAINTAINER_EMAILS ?? "").length > 0 && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
