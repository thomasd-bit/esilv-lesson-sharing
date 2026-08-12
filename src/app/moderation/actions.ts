"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleConfig } from "@/lib/supabase/admin";
import { isMaintainerEmail, isReportStatus, isResourceVisibility } from "@/lib/moderation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireMaintainer() {
  if (!hasServiceRoleConfig()) {
    throw new Error("La modération n’est pas configurée.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isMaintainerEmail(user.email, process.env.MAINTAINER_EMAILS ?? "")) {
    redirect("/");
  }

  return user.id;
}

export async function updateReportStatus(formData: FormData) {
  await requireMaintainer();
  const reportId = formData.get("reportId");
  const status = formData.get("status");

  if (typeof reportId !== "string" || !uuidPattern.test(reportId) || typeof status !== "string" || !isReportStatus(status)) {
    return;
  }

  const { error } = await createAdminClient()
    .from("resource_reports")
    .update({ status })
    .eq("id", reportId);

  if (error) {
    throw new Error("Le signalement n’a pas pu être mis à jour.");
  }

  revalidatePath("/moderation");
}

export async function updateResourceVisibility(formData: FormData) {
  const maintainerId = await requireMaintainer();
  const resourceId = formData.get("resourceId");
  const status = formData.get("status");

  if (typeof resourceId !== "string" || !uuidPattern.test(resourceId) || typeof status !== "string" || !isResourceVisibility(status)) {
    return;
  }

  const { data, error } = await createAdminClient()
    .rpc("moderate_resource_visibility", {
      target_resource_id: resourceId,
      target_status: status,
      actor_id: maintainerId,
    })
    .maybeSingle();

  if (error || !data) {
    throw new Error("La ressource n’a pas pu être mise à jour.");
  }

  revalidatePath("/moderation");
  revalidatePath("/");
  revalidatePath(`/resources/${resourceId}`);
}
