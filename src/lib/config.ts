const rawAllowedDomains = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "";

export const appConfig = {
  name: "Passerelle",
  school: "Pôle Léonard de Vinci",
  description: "Le coin d’entraide où les étudiants partagent ce qui leur a vraiment servi.",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  allowedEmailDomains: rawAllowedDomains
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean),
};

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isAllowedEmail(email: string) {
  if (appConfig.allowedEmailDomains.length === 0) {
    return true;
  }

  const domain = email.trim().toLowerCase().split("@").at(-1);
  return Boolean(domain && appConfig.allowedEmailDomains.includes(domain));
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase n’est pas configuré. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local.",
    );
  }

  return { url, publishableKey };
}

