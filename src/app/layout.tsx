import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passerelle — l’entraide étudiante",
  description: "Partagez les ressources qui vous ont vraiment servi entre étudiants du Pôle Léonard de Vinci.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><a className="skip-link" href="#main-content">Aller au contenu</a>{children}</body>
    </html>
  );
}
