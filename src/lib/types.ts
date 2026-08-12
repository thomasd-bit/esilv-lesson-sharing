export type ResourceKind = "course" | "exam" | "project" | "summary" | "other";

export type StudyYear = "1A" | "2A" | "3A" | "4A" | "5A" | "Autre";

export interface Profile {
  id: string;
  display_name: string;
  programme: string | null;
  study_year: StudyYear | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  subject: string;
  programme: string;
  study_year: StudyYear;
  link_url: string | null;
  file_path: string | null;
  author_id: string;
  status: "published" | "hidden";
  created_at: string;
  updated_at: string;
}

export interface ResourceWithAuthor extends Resource {
  author: Profile | null;
}

export interface ResourceComment {
  id: string;
  resource_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
}

export interface ResourceCollection {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceCollectionItem {
  collection_id: string;
  resource_id: string;
  created_at: string;
}

export type NotificationType = "like" | "comment";

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string;
  resource_id: string | null;
  comment_id: string | null;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
}

export const RESOURCE_KINDS: Array<{ value: ResourceKind; label: string }> = [
  { value: "course", label: "Cours" },
  { value: "exam", label: "Examen / annale" },
  { value: "project", label: "Projet" },
  { value: "summary", label: "Fiche / résumé" },
  { value: "other", label: "Autre" },
];

export const STUDY_YEARS: StudyYear[] = ["1A", "2A", "3A", "4A", "5A", "Autre"];

export const RESOURCE_KIND_LABELS = Object.fromEntries(
  RESOURCE_KINDS.map(({ value, label }) => [value, label]),
) as Record<ResourceKind, string>;
