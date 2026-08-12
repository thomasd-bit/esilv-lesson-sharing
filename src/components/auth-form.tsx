"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, LogIn, Mail, UserRoundPlus } from "lucide-react";
import { appConfig, isAllowedEmail } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import {
  firstValidationError,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";
import { STUDY_YEARS } from "@/lib/types";

type Mode = "signin" | "signup" | "reset";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);

  async function resendConfirmationEmail() {
    if (!confirmationEmail || resendPending) return;
    setResendPending(true);
    setError(null);
    setSuccess(null);
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: { emailRedirectTo: `${appConfig.appUrl}/auth/callback` },
    });
    if (resendError) {
      setError("L’e-mail n’a pas pu être renvoyé. Attendez un instant puis réessayez.");
    } else {
      setSuccess("Un nouvel e-mail de confirmation vient d’être envoyé.");
    }
    setResendPending(false);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);
    setConfirmationEmail(null);

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    if (mode === "reset") {
      const emailResult = signInSchema.shape.email.safeParse(email);
      if (!emailResult.success) {
        setError(firstValidationError(emailResult.error));
        setPending(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appConfig.appUrl}/auth/callback?next=/auth/reset-password`,
      });
      if (resetError) {
        setError("Le lien de récupération n’a pas pu être envoyé. Réessayez dans un instant.");
      } else {
        setSuccess("Si un compte correspond à cette adresse, un lien de récupération vient d’être envoyé.");
      }
      setPending(false);
      return;
    }

    if (mode === "signin") {
      const parsed = signInSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(firstValidationError(parsed.error));
        setPending(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("L’adresse e-mail ou le mot de passe ne correspondent pas.");
        setPending(false);
        return;
      }

      router.replace("/");
      router.refresh();
      return;
    }

    const values = {
      email,
      password,
      displayName: String(formData.get("displayName") ?? ""),
      programme: String(formData.get("programme") ?? ""),
      studyYear: String(formData.get("studyYear") ?? ""),
    };
    const parsed = signUpSchema.safeParse(values);

    if (!parsed.success) {
      setError(firstValidationError(parsed.error));
      setPending(false);
      return;
    }

    if (!isAllowedEmail(email)) {
      const domains = appConfig.allowedEmailDomains.map((domain) => `@${domain}`).join(", ");
      setError(`Utilisez une adresse de l’école (${domains}).`);
      setPending(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: values.displayName.trim(),
          programme: values.programme.trim(),
          study_year: values.studyYear,
        },
        emailRedirectTo: `${appConfig.appUrl}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message.includes("already registered")
        ? "Un compte existe déjà avec cette adresse. Connectez-vous plutôt."
        : "Impossible de créer le compte pour le moment. Réessayez dans un instant.");
      setPending(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setSuccess("Votre compte est créé. Consultez votre boîte mail pour confirmer l’adresse avant de vous connecter.");
    setConfirmationEmail(email);
    setMode("signin");
    setPending(false);
  }

  return (
    <div className="auth-form-wrap">
      <div className="brand-lockup">
        <span className="brand-mark brand-mark-small">P</span>
        <span>{appConfig.name}</span>
      </div>
      <h2>{mode === "signin" ? "Ravi de vous revoir." : mode === "signup" ? "Créer votre espace." : "Retrouver son accès."}</h2>
      <p>
        {mode === "signin"
          ? "Retrouvez les ressources déposées par votre promo."
          : mode === "signup"
            ? "Un profil simple pour savoir qui partage quoi."
            : "Recevez un lien sécurisé pour choisir un nouveau mot de passe."}
      </p>

      {mode === "reset" ? <button className="text-button auth-back-link" onClick={() => { setMode("signin"); setError(null); setSuccess(null); setConfirmationEmail(null); }} type="button"><ArrowLeft size={14} /> Retour à la connexion</button> : null}

      {mode !== "reset" ? <div className="auth-tabs" role="tablist" aria-label="Accès au compte">
        <button
          className={`auth-tab ${mode === "signin" ? "auth-tab-active" : ""}`}
          onClick={() => { setMode("signin"); setError(null); setSuccess(null); setConfirmationEmail(null); }}
          role="tab"
          aria-selected={mode === "signin"}
          type="button"
        >
          Se connecter
        </button>
        <button
          className={`auth-tab ${mode === "signup" ? "auth-tab-active" : ""}`}
          onClick={() => { setMode("signup"); setError(null); setSuccess(null); setConfirmationEmail(null); }}
          role="tab"
          aria-selected={mode === "signup"}
          type="button"
        >
          S’inscrire
        </button>
      </div> : null}

      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        {mode === "signup" ? (
          <div className="form-grid">
            <div className="field field-full">
              <label htmlFor="displayName">Nom affiché</label>
              <input id="displayName" name="displayName" placeholder="Prénom Nom" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="programme">Formation</label>
              <input id="programme" name="programme" placeholder="Cycle ingénieur, Bachelors…" required />
            </div>
            <div className="field">
              <label htmlFor="studyYear">Année</label>
              <select id="studyYear" name="studyYear" defaultValue="" required>
                <option value="" disabled>Choisir</option>
                {STUDY_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" placeholder="vous@ecole.fr" autoComplete="email" required />
          {mode === "signup" ? <span className="field-hint">Utilisez votre adresse étudiante.</span> : null}
        </div>
        {mode !== "reset" ? <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" placeholder="8 caractères minimum" autoComplete={mode === "signin" ? "current-password" : "new-password"} required />
          {mode === "signin" ? <button className="text-button auth-reset-link" onClick={() => { setMode("reset"); setError(null); setSuccess(null); setConfirmationEmail(null); }} type="button">Mot de passe oublié ?</button> : null}
        </div> : null}

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {success ? <p className="form-success" role="status">{success}</p> : null}
        {confirmationEmail ? <button className="button button-secondary" disabled={resendPending} onClick={() => void resendConfirmationEmail()} type="button">
          {resendPending ? <LoaderCircle size={17} className="spin" /> : <Mail size={17} />}
          {resendPending ? "Renvoi…" : "Renvoyer l’e-mail de confirmation"}
        </button> : null}

        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? <LoaderCircle size={17} className="spin" /> : mode === "signin" ? <LogIn size={17} /> : mode === "signup" ? <UserRoundPlus size={17} /> : <Mail size={17} />}
          {pending ? "Un instant…" : mode === "signin" ? "Entrer dans Passerelle" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
        </button>
      </form>
    </div>
  );
}
