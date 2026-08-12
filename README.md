# Passerelle

Passerelle est un espace de partage entre étudiants du Pôle Léonard de Vinci. On y dépose les supports qui ont réellement servi : fiches, cours, annales, projets et liens utiles. Chaque ressource est attachée à une matière, une formation et une année pour rester retrouvable après la semaine des partiels.

Le projet est volontairement simple dans son premier périmètre : un compte étudiant avec récupération de mot de passe et accompagnement pour compléter son profil, un fil de ressources, la recherche, l’édition des partages par leur auteur, les commentaires modifiables ou supprimables par leur auteur, les likes, les sauvegardes, les collections personnelles, les notifications d’interaction et un signalement intégré. Les fichiers sont privés dans Supabase Storage et accessibles uniquement aux membres connectés.

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
git clone https://github.com/thomasd-bit/esilv-lesson-sharing.git
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
2. Dans l’éditeur SQL, exécutez les migrations dans l’ordre : `20260811000000_initial_schema.sql`, `20260811010000_school_email_guard.sql`, `20260812000000_collections.sql`, `20260812010000_notifications.sql`, puis `20260812020000_study_year_integrity.sql`.
3. Dans Authentication → URL Configuration, ajoutez `http://localhost:3000/auth/callback` aux Redirect URLs.
4. Dans Authentication → Providers → Email, choisissez si les nouveaux comptes doivent confirmer leur adresse. En production, gardez la confirmation activée. Ajoutez aussi l’URL de callback de récupération si votre configuration Supabase utilise une liste stricte de Redirect URLs.
5. Copiez l’URL du projet et sa publishable key dans `.env.local`.

Les migrations créent les tables de profils, ressources, likes, sauvegardes, commentaires, signalements, collections privées et notifications, ainsi qu’une liste de domaines autorisés pour l’inscription. Chaque étudiant reçoit automatiquement une collection « À lire ». Un like ou un commentaire crée une notification côté base pour l’auteur de la ressource, sans notification pour ses propres actions. Les années d’étude acceptées sont `1A`, `2A`, `3A`, `4A`, `5A` et `Autre`; la contrainte SQL est ajoutée `not valid` pour ne pas bloquer une base qui contiendrait déjà une ancienne valeur à nettoyer. Elles activent RLS sur chaque table et créent le bucket privé `resource-files`. La clé secrète Supabase ne doit jamais être mise dans le navigateur ni dans Git.

Dans Storage, gardez `resource-files` privé et configurez une limite de 10 Mo ainsi que les types MIME correspondant aux PDF, images PNG/JPEG/WebP, documents Word, présentations PowerPoint, tableurs Excel et archives ZIP. L’interface applique la même règle avant l’envoi, mais la restriction du bucket Supabase doit rester le contrôle effectif pour les requêtes qui contournent le navigateur.

## Vérifier le projet

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

La navigation clavier commence par un lien « Aller au contenu », les éléments interactifs gardent un focus visible et les animations respectent la préférence système de mouvement réduit.

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
