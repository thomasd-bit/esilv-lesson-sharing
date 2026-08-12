import type { Profile } from "@/lib/types";

export function getProfileCompletion(profile: Pick<Profile, "display_name" | "programme" | "study_year"> | null) {
  const fields = [profile?.display_name, profile?.programme, profile?.study_year];
  const completed = fields.filter((value) => Boolean(value?.trim())).length;
  return {
    completed,
    total: fields.length,
    percent: Math.round((completed / fields.length) * 100),
  };
}
