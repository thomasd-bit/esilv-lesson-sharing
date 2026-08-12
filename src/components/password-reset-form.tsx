"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, KeyRound, LoaderCircle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { firstValidationError, passwordResetSchema } from "@/lib/validation";

export function PasswordResetForm({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const parsed = passwordResetSchema.safeParse({
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    if (!parsed.success) {
      setError(firstValidationError(parsed.error));
      setPending(false);
      return;
    }

    const { error: updateError } = await createClient().auth.updateUser({ password: parsed.data.password });
    if (updateError) {
      setError("Le mot de passe n’a pas pu être mis à jour. Demandez un nouveau lien puis réessayez.");
      setPending(false);
      return;
    }

    setMessage("Votre mot de passe est à jour. Vous pouvez retourner dans Passerelle.");
    setPending(false);
  }

  return (
    <div className="form-card password-reset-card">
      <div className="profile-card-top">
        <span className="avatar"><KeyRound size={20} /></span>
        <div><strong>Réinitialiser le mot de passe</strong><small>{email}</small></div>
      </div>
      <p className="field-hint password-reset-intro">Choisissez un mot de passe d’au moins 8 caractères pour sécuriser votre compte.</p>
      <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
        <div className="field">
          <label htmlFor="password">Nouveau mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="new-password" placeholder="8 caractères minimum" required />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Retapez votre mot de passe" required />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status"><Check size={15} style={{ verticalAlign: "-3px", marginRight: "5px" }} />{message}</p> : null}
        {message ? (
          <Link className="button button-primary" href="/"><Check size={17} /> Retour aux ressources</Link>
        ) : (
          <button className="button button-primary" disabled={pending} type="submit">
            {pending ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}
            {pending ? "Mise à jour…" : "Mettre à jour"}
          </button>
        )}
      </form>
    </div>
  );
}
