export function reportSubmissionMessage(errorCode: string | undefined) {
  return errorCode === "23505"
    ? "Vous avez déjà un signalement en cours pour cette ressource."
    : "Le signalement n’a pas pu être envoyé.";
}
