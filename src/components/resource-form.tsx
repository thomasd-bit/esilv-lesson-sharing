"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { firstValidationError, resourceSchema } from "@/lib/validation";
import { RESOURCE_KINDS, STUDY_YEARS } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip";

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export function ResourceForm({ initialProgramme, initialStudyYear }: { initialProgramme: string; initialStudyYear: string }) {
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
    if (!file && !values.linkUrl.trim()) {
      setError("Ajoutez un lien ou un fichier pour que la ressource soit consultable.");
      setPending(false);
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      setError("Le fichier ne doit pas dépasser 10 Mo.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth");
      return;
    }

    let uploadedPath: string | null = null;
    if (file) {
      uploadedPath = `${user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("resource-files")
        .upload(uploadedPath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setError("Le fichier n’a pas pu être envoyé. Vérifiez son format puis réessayez.");
        setPending(false);
        return;
      }
    }

    const { data, error: insertError } = await supabase
      .from("resources")
      .insert({
        title: values.title.trim(),
        description: values.description.trim(),
        kind: values.kind,
        subject: values.subject.trim(),
        programme: values.programme.trim(),
        study_year: values.studyYear,
        link_url: values.linkUrl.trim() || null,
        file_path: uploadedPath,
        author_id: user.id,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      if (uploadedPath) {
        await supabase.storage.from("resource-files").remove([uploadedPath]);
      }
      setError("La ressource n’a pas pu être publiée. Vérifiez les informations puis réessayez.");
      setPending(false);
      return;
    }

    router.push(`/resources/${data.id}`);
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="title">Titre du support</label>
          <input id="title" name="title" placeholder="Ex. Fiche de révision — probabilités" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="kind">Type</label>
          <select id="kind" name="kind" defaultValue="course" required>
            {RESOURCE_KINDS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="subject">Matière</label>
          <input id="subject" name="subject" placeholder="Probabilités, Python…" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="programme">Formation</label>
          <input id="programme" name="programme" defaultValue={initialProgramme} placeholder="Cycle ingénieur…" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="studyYear">Année concernée</label>
          <select id="studyYear" name="studyYear" defaultValue={initialStudyYear} required>
            <option value="" disabled>Choisir</option>
            {STUDY_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div className="field field-full">
          <label htmlFor="description">Pourquoi ce support vaut le détour ?</label>
          <textarea id="description" name="description" placeholder="Expliquez ce qu’on y trouve, pour quel cours il sert et à quel moment il vous a aidé…" required maxLength={2000} />
          <span className="field-hint">20 caractères minimum. Ce texte aide les autres étudiants à choisir rapidement.</span>
        </div>
        <div className="field field-full">
          <label htmlFor="linkUrl">Lien externe (facultatif si vous envoyez un fichier)</label>
          <input id="linkUrl" name="linkUrl" type="url" placeholder="https://…" inputMode="url" />
        </div>
        <div className="field field-full">
          <label htmlFor="file">Fichier (facultatif si vous ajoutez un lien)</label>
          <div className="file-drop">
            <FileUp size={22} aria-hidden="true" />
            <span>{selectedFile ?? "PDF, image, document ou archive — 10 Mo maximum"}</span>
            <input id="file" name="file" type="file" accept={ACCEPTED_FILE_TYPES} onChange={(event) => setSelectedFile(event.target.files?.[0]?.name ?? null)} />
          </div>
        </div>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="inline-actions" style={{ justifyContent: "flex-end", marginTop: "4px" }}>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}
          {pending ? "Publication…" : "Publier la ressource"}
        </button>
      </div>
    </form>
  );
}
