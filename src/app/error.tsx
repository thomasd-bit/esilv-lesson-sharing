"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-center">
      <section className="message-card">
        <span className="eyebrow">Passerelle</span>
        <h1>Un problème est survenu.</h1>
        <p>La page n’a pas pu être chargée. Réessayez, cela suffit souvent.</p>
        <button className="button button-primary" onClick={() => reset()} type="button">
          Réessayer
        </button>
      </section>
    </main>
  );
}

