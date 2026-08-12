"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, Save, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resourceFileError, resourceFilePath, RESOURCE_FILE_ACCEPT } from "@/lib/files";
import { firstValidationError, resourceSchema } from "@/lib/validation";
import { RESOURCE_KINDS, STUDY_YEARS, type Resource } from "@/lib/types";

type ResourceFormProps = {
  initialProgramme: string;
  initialStudyYear: string;
  resource?: Resource;
};

export function ResourceForm({ initialProgramme, initialStudyYear, resource }: ResourceFormProps) {
  const editing = Boolean(resource);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const fileValue = formData.get("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    const values = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      programme: String(formData.get("programme") ?? ""),
      studyYear: String(formData.get("studyYear") ?? ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
    };
    const parsed = resourceSchema.safeParse(values);

    if (!parsed.success) {
      setError(firstValidationError(parsed.error));
      setPending(false);
      return;
    }
    if (!file && !values.linkUrl.trim() && !resource?.file_path) {
      setError("Ajoutez un lien ou un fichier pour que la ressource soit consultable.");
      setPending(false);
      return;
    }
    if (file) {
      const fileError = resourceFileError(file);
      if (fileError) {
        setError(fileError);
        setPending(false);
        return;
      }
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth");
      return;
    }

    let uploadedPath: string | null = resource?.file_path ?? null;
    let replacementPath: string | null = null;
    if (file) {
      replacementPath = resourceFilePath(user.id, crypto.randomUUID(), file.name);
      uploadedPath = replacementPath;
      const { error: uploadError } = await supabase.storage
        .from("resource-files")
        .upload(uploadedPath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setError("Le fichier n’a pas pu être envoyé. Vérifiez son format puis réessayez.");
        setPending(false);
        return;
      }
    }

    const resourceValues = {
        title: values.title.trim(),
        description: values.description.trim(),
        kind: values.kind,
        subject: values.subject.trim(),
        programme: values.programme.trim(),
        study_year: values.studyYear,
        link_url: values.linkUrl.trim() || null,
        file_path: uploadedPath,
      };
    const query = editing
      ? supabase.from("resources").update(resourceValues).eq("id", resource?.id).eq("author_id", user.id)
      : supabase.from("resources").insert({ ...resourceValues, author_id: user.id });
    const { data, error: saveError } = await query.select("id").single();

    if (saveError || !data) {
      if (replacementPath) {
        await supabase.storage.from("resource-files").remove([replacementPath]);
      }
      setError(editing ? "La ressource n’a pas pu être modifiée. Vérifiez les informations puis réessayez." : "La ressource n’a pas pu être publiée. Vérifiez les informations puis réessayez.");
      setPending(false);
      return;
    }

    if (editing && resource?.file_path && resource.file_path !== uploadedPath) {
      await supabase.storage.from("resource-files").remove([resource.file_path]);
    }

    router.push(`/resources/${data.id}`);
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="title">Titre du support</label>
          <input id="title" name="title" defaultValue={resource?.title} placeholder="Ex. Fiche de révision — probabilités" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="kind">Type</label>
          <select id="kind" name="kind" defaultValue={resource?.kind ?? "course"} required>
            {RESOURCE_KINDS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="subject">Matière</label>
          <input id="subject" name="subject" defaultValue={resource?.subject} placeholder="Probabilités, Python…" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="programme">Formation</label>
          <input id="programme" name="programme" defaultValue={resource?.programme ?? initialProgramme} placeholder="Cycle ingénieur…" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="studyYear">Année concernée</label>
          <select id="studyYear" name="studyYear" defaultValue={resource?.study_year ?? initialStudyYear} required>
            <option value="" disabled>Choisir</option>
            {STUDY_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div className="field field-full">
          <label htmlFor="description">Pourquoi ce support vaut le détour ?</label>
          <textarea id="description" name="description" defaultValue={resource?.description} placeholder="Expliquez ce qu’on y trouve, pour quel cours il sert et à quel moment il vous a aidé…" required maxLength={2000} />
          <span className="field-hint">20 caractères minimum. Ce texte aide les autres étudiants à choisir rapidement.</span>
        </div>
        <div className="field field-full">
          <label htmlFor="linkUrl">Lien externe (facultatif si vous envoyez un fichier)</label>
          <input id="linkUrl" name="linkUrl" type="url" defaultValue={resource?.link_url ?? ""} placeholder="https://…" inputMode="url" />
        </div>
        <div className="field field-full">
          <label htmlFor="file">{editing ? "Remplacer le fichier (facultatif)" : "Fichier (facultatif si vous ajoutez un lien)"}</label>
          <div className="file-drop">
            <FileUp size={22} aria-hidden="true" />
            <span>{selectedFile ?? (editing ? "Laissez vide pour conserver le fichier actuel" : "PDF, image, document ou archive — 10 Mo maximum")}</span>
            <input id="file" name="file" type="file" accept={RESOURCE_FILE_ACCEPT} onChange={(event) => setSelectedFile(event.target.files?.[0]?.name ?? null)} />
          </div>
          <span className="field-hint">10 Mo maximum. Le fichier actuel est conservé si vous ne choisissez rien.</span>
        </div>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="inline-actions" style={{ justifyContent: "flex-end", marginTop: "4px" }}>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? <LoaderCircle size={17} className="spin" /> : editing ? <Save size={17} /> : <Send size={17} />}
          {pending ? (editing ? "Enregistrement…" : "Publication…") : editing ? "Enregistrer les changements" : "Publier la ressource"}
        </button>
      </div>
    </form>
  );
}
