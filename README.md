# Passerelle

Passerelle est un espace de partage entre étudiants du Pôle Léonard de Vinci. On y dépose les supports qui ont réellement servi : fiches, cours, annales, projets et liens utiles. Chaque ressource est attachée à une matière, une formation et une année pour rester retrouvable après la semaine des partiels.

Le projet est volontairement simple dans son premier périmètre : un compte étudiant, un fil de ressources, la recherche, les commentaires, les likes, les sauvegardes et un signalement intégré. Les fichiers sont privés dans Supabase Storage et accessibles uniquement aux membres connectés.

## Stack

- Next.js 16 et React 19 avec App Router ;
- TypeScript strict et CSS local, sans dépendance de composants visuels ;
- Supabase Auth pour les comptes e-mail/mot de passe ;
- Supabase Postgres avec Row Level Security ;
- Supabase Storage pour les fichiers partagés ;
- Vitest pour les règles de validation et les petits comportements déterministes.

## Démarrer en local

Pré-requis : Node.js 20 ou plus récent et un projet Supabase.

```bash
git clone https://github.com/urbaninator-maintainer/esilv-lesson-sharing.git
cd esilv-lesson-sharing
npm install
cp .env.example .env.local
npm run dev
```

Renseignez ensuite `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=devinci.fr,edu.devinci.fr,ext.devinci.fr,esilv.fr
```

`NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` accepte une liste séparée par des virgules. Elle doit être ajustée aux domaines réellement attribués aux étudiants par l’école. Une liste vide désactive ce filtre pendant un test local.

## Préparer Supabase

1. Créez un projet Supabase.
2. Dans l’éditeur SQL, exécutez `supabase/migrations/20260811000000_initial_schema.sql`.
3. Dans Authentication → URL Configuration, ajoutez `http://localhost:3000/auth/callback` aux Redirect URLs.
4. Dans Authentication → Providers → Email, choisissez si les nouveaux comptes doivent confirmer leur adresse. En production, gardez la confirmation activée.
5. Copiez l’URL du projet et sa publishable key dans `.env.local`.

Les migrations créent les tables de profils, ressources, likes, sauvegardes, commentaires et signalements, ainsi qu’une liste de domaines autorisés pour l’inscription. Elles activent RLS sur chaque table et créent le bucket privé `resource-files`. La clé secrète Supabase ne doit jamais être mise dans le navigateur ni dans Git.

## Vérifier le projet

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run build` peut afficher l’écran de configuration si les variables Supabase ne sont pas présentes ; dès qu’elles sont renseignées, la page d’accueil exige une session et redirige les visiteurs vers l’inscription.

## Déployer

Vercel convient au serveur Next.js. Configurez les quatre variables d’environnement dans le projet Vercel, puis ajoutez l’URL de production suivie de `/auth/callback` dans les Redirect URLs Supabase. Le schéma de données reste hébergé dans Supabase ; aucun secret de service n’est nécessaire dans l’application.

## Organisation du code

```text
src/app/                 Routes et pages Next.js
src/components/          Parcours auth, fil, formulaires et fiche ressource
src/lib/                 Configuration, validation, formatage et clients Supabase
supabase/migrations/     Schéma SQL et politiques RLS
```

## Contribuer

Consultez [CONTRIBUTING.md](CONTRIBUTING.md) avant d’ouvrir une issue ou une pull request. Les retours de vrais étudiants sont particulièrement utiles pour choisir les filtres, les formations et les règles de modération.
