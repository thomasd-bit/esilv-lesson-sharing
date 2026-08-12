# Passerelle

Passerelle est un espace de partage entre étudiants du Pôle Léonard de Vinci. On y dépose les supports qui ont réellement servi : fiches, cours, annales, projets et liens utiles. Chaque ressource est attachée à une matière, une formation et une année pour rester retrouvable après la semaine des partiels.

Le projet est volontairement simple dans son premier périmètre : un compte étudiant avec récupération de mot de passe et accompagnement pour compléter son profil, un fil de ressources avec recherche, chargement progressif, filtres par type, année et formation, des profils membres dont les partages anciens restent retrouvables par chargement progressif, l’édition des partages et le remplacement de leurs fichiers par leur auteur, le partage d’un lien canonique vers chaque fiche, les commentaires chargés progressivement avec compteur exact et modifiables ou supprimables par leur auteur, les likes, les sauvegardes chargées progressivement avec compteurs exacts par collection, les collections personnelles, les notifications d’interaction filtrables par état de lecture avec compteurs exacts et chargement progressif, et un signalement intégré. Les fichiers sont privés dans Supabase Storage et accessibles uniquement aux membres connectés.

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
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
MAINTAINER_EMAILS=maintainer@ecole.fr
```

`NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` accepte une liste séparée par des virgules. Elle doit être ajustée aux domaines réellement attribués aux étudiants par l’école. Une liste vide désactive ce filtre pendant un test local.

`MAINTAINER_EMAILS` accepte une liste d’adresses séparées par des virgules et donne accès à `/moderation`. La file utilise `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur pour lire et mettre à jour les signalements malgré RLS ; ne préfixez jamais cette clé par `NEXT_PUBLIC_`, ne la committez pas et ne l’utilisez pas dans un composant client.

## Préparer Supabase

1. Créez un projet Supabase.
2. Dans l’éditeur SQL, exécutez les migrations dans l’ordre : `20260811000000_initial_schema.sql`, `20260811010000_school_email_guard.sql`, `20260812000000_collections.sql`, `20260812010000_notifications.sql`, `20260812020000_study_year_integrity.sql`, `20260812030000_report_deduplication.sql`, `20260812040000_profile_bio.sql`, `20260812050000_restrict_resource_file_reads.sql`, puis `20260812060000_like_counts.sql`.
3. Dans Authentication → URL Configuration, ajoutez `http://localhost:3000/auth/callback` aux Redirect URLs.
4. Dans Authentication → Providers → Email, choisissez si les nouveaux comptes doivent confirmer leur adresse. En production, gardez la confirmation activée. Ajoutez aussi l’URL de callback de récupération si votre configuration Supabase utilise une liste stricte de Redirect URLs.
5. Copiez l’URL du projet et sa publishable key dans `.env.local`.

Les migrations créent les tables de profils, ressources, likes, sauvegardes, commentaires, signalements, collections privées et notifications, ainsi qu’une liste de domaines autorisés pour l’inscription. Chaque étudiant reçoit automatiquement une collection « À lire ». Un like ou un commentaire crée une notification côté base pour l’auteur de la ressource, sans notification pour ses propres actions. Le compteur de likes est maintenu atomiquement par Postgres pour que le tri « Plus appréciées » reste correct avant la pagination. Les années d’étude acceptées sont `1A`, `2A`, `3A`, `4A`, `5A` et `Autre`; la contrainte SQL est ajoutée `not valid` pour ne pas bloquer une base qui contiendrait déjà une ancienne valeur à nettoyer. Un même étudiant ne peut garder qu’un signalement ouvert par ressource. La page privée `/moderation` permet aux adresses de `MAINTAINER_EMAILS` de traiter ou fermer ces signalements, puis de masquer ou republier une ressource de façon réversible après vérification. La file est paginée par 50 éléments et ses compteurs par état sont calculés séparément pour ne pas masquer les signalements plus anciens ni limiter les statistiques aux éléments affichés. Elle affiche aussi des compteurs agrégés de comptes, ressources publiées, likes et commentaires pour suivre l’usage sans exposer de données personnelles ; ces compteurs ne valent pas une mesure d’utilisateurs actifs. Elles activent RLS sur chaque table et créent le bucket privé `resource-files`. La clé secrète Supabase ne doit jamais être mise dans le navigateur ni dans Git.

Dans Storage, gardez `resource-files` privé et configurez une limite de 10 Mo ainsi que les types MIME correspondant aux PDF, images PNG/JPEG/WebP, documents Word, présentations PowerPoint, tableurs Excel et archives ZIP. L’interface applique la même règle avant l’envoi, mais la restriction du bucket Supabase doit rester le contrôle effectif pour les requêtes qui contournent le navigateur. La dernière migration limite aussi la lecture d’un objet à une ressource publiée ou à son auteur ; un fichier lié à une ressource masquée n’est donc pas exposé aux autres étudiants.

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

Vercel convient au serveur Next.js. Configurez les variables publiques et, si la modération est activée, `SUPABASE_SERVICE_ROLE_KEY` et `MAINTAINER_EMAILS` comme variables serveur uniquement dans le projet Vercel, puis ajoutez l’URL de production suivie de `/auth/callback` dans les Redirect URLs Supabase. Le schéma de données reste hébergé dans Supabase.

## Organisation du code

```text
src/app/                 Routes et pages Next.js
src/components/          Parcours auth, fil, formulaires et fiche ressource
src/lib/                 Configuration, validation, formatage, modération et clients Supabase
src/app/moderation/      File privée de suivi des signalements
src/app/members/         Profils publics et ressources d’un étudiant
supabase/migrations/     Schéma SQL et politiques RLS
docs/                     Mesure d’adoption et boucle de feedback
```

## Suivre l’usage

Le snapshot public et les définitions des indicateurs sont maintenus dans [docs/ADOPTION.md](docs/ADOPTION.md). Les retours étudiants passent par le [formulaire public de feedback](https://github.com/thomasd-bit/esilv-lesson-sharing/issues/new?template=student-feedback.yml) ; ne publiez jamais de donnée personnelle ou de document de cours privé.

## Contribuer

Consultez [CONTRIBUTING.md](CONTRIBUTING.md) avant d’ouvrir une issue ou une pull request. Les retours de vrais étudiants sont particulièrement utiles pour choisir les filtres, les formations et les règles de modération.

La CI se lance sur les pushes, les pull requests vers `main` ou `codex/**`, et peut aussi être démarrée manuellement depuis l’onglet Actions de GitHub.

Dependabot surveille les dépendances npm chaque semaine et les actions GitHub chaque mois afin que les mises à jour arrivent sous forme de pull requests reviewables.
