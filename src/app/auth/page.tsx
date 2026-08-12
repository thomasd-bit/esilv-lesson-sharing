import { AuthForm } from "@/components/auth-form";
import { appConfig } from "@/lib/config";
import { BookOpenCheck, CircleCheck, UsersRound } from "lucide-react";

export default function AuthPage() {
  return (
    <main id="main-content" className="auth-page">
      <section className="auth-copy">
        <div>
          <div className="brand-lockup">
            <span className="brand-mark">P</span>
            <span>{appConfig.name}</span>
          </div>
          <div className="hero-copy" style={{ marginTop: "clamp(64px, 14vh, 150px)" }}>
            <span className="eyebrow">{appConfig.school}</span>
            <h1>Les bons supports circulent enfin au bon endroit.</h1>
            <p>{appConfig.description}</p>
          </div>
          <ul className="auth-benefits">
            <li><BookOpenCheck size={18} /> Fiches, annales et projets classés par matière</li>
            <li><UsersRound size={18} /> Des profils étudiants, pas des comptes anonymes</li>
            <li><CircleCheck size={18} /> Une ressource utile se partage en quelques secondes</li>
          </ul>
        </div>
        <p className="auth-footer">Un espace fait pour l’entraide quotidienne entre étudiants.</p>
      </section>
      <section className="auth-panel">
        <AuthForm />
      </section>
    </main>
  );
}
