"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STUDY_YEARS, type Profile } from "@/lib/types";
import { firstValidationError, profileSchema } from "@/lib/validation";

export function ProfileForm({ userId, profile }: { userId: string; profile: Profile | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "");
    const programme = String(formData.get("programme") ?? "");
    const studyYear = String(formData.get("studyYear") ?? "");
    const bio = String(formData.get("bio") ?? "");
    const result = profileSchema.safeParse({ displayName, programme, studyYear, bio });
    if (!result.success) { setError(firstValidationError(result.error)); setPending(false); return; }

    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ display_name: result.data.displayName, programme: result.data.programme, study_year: result.data.studyYear, bio: result.data.bio || null }).eq("id", userId);
    if (updateError) {
      setError("Le profil n’a pas pu être enregistré.");
      setPending(false);
      return;
    }
    await supabase.auth.updateUser({ data: { display_name: result.data.displayName, programme: result.data.programme, study_year: result.data.studyYear, bio: result.data.bio || null } });
    setMessage("Profil enregistré.");
    setPending(false);
    router.refresh();
  }

  return (
    <form className="form-stack" style={{ marginTop: "25px" }} onSubmit={(event) => void handleSubmit(event)}>
      <div className="form-grid">
        <div className="field field-full"><label htmlFor="displayName">Nom affiché</label><input id="displayName" name="displayName" defaultValue={profile?.display_name ?? ""} required /></div>
        <div className="field"><label htmlFor="programme">Formation</label><input id="programme" name="programme" defaultValue={profile?.programme ?? ""} required /></div>
        <div className="field"><label htmlFor="studyYear">Année</label><select id="studyYear" name="studyYear" defaultValue={profile?.study_year ?? ""} required><option value="" disabled>Choisir</option>{STUDY_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
        <div className="field field-full"><label htmlFor="bio">Présentation <em>(facultatif)</em></label><textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} maxLength={280} placeholder="Ce que vous aimez partager ou apprendre…" /><span className="field-hint">280 caractères maximum. Évitez les informations personnelles dont vous n’avez pas besoin.</span></div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status"><Check size={15} style={{ verticalAlign: "-3px", marginRight: "5px" }} />{message}</p> : null}
      <div className="inline-actions" style={{ justifyContent: "flex-end" }}><button className="button button-primary" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Enregistrer</button></div>
    </form>
  );
}
