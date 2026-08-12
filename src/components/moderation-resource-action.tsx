"use client";

import type { FormEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { updateResourceVisibility } from "@/app/moderation/actions";
import type { ResourceVisibility } from "@/lib/moderation";

interface ModerationResourceActionProps {
  resourceId: string;
  status: ResourceVisibility;
  title: string;
}

export function ModerationResourceAction({ resourceId, status, title }: ModerationResourceActionProps) {
  const actionLabel = status === "hidden" ? "Masquer la ressource" : "Rendre visible";

  function confirmVisibilityChange(event: FormEvent<HTMLFormElement>) {
    if (status !== "hidden") return;

    const confirmed = window.confirm(`Masquer « ${title} » ? Le fichier ne sera plus accessible aux autres étudiants.`);
    if (!confirmed) event.preventDefault();
  }

  return (
    <form action={updateResourceVisibility} onSubmit={confirmVisibilityChange}>
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="status" value={status} />
      <VisibilitySubmitButton status={status}>{actionLabel}</VisibilitySubmitButton>
    </form>
  );
}

function VisibilitySubmitButton({ status, children }: { status: ResourceVisibility; children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button className={`button button-small ${status === "hidden" ? "button-danger" : "button-secondary"}`} type="submit" disabled={pending}>
      {pending ? "Mise à jour…" : children}
    </button>
  );
}
