# Journal des changements

## En préparation

### Ajouté

- récupération de compte par e-mail et changement de mot de passe depuis un lien sécurisé ;

### Sécurité

- callback d’authentification limité aux chemins internes pour éviter les redirections externes.

## [0.1.0] - 2026-08-11

### Ajouté

- inscription et connexion par e-mail avec profil étudiant ;
- fil de ressources filtrable par type, année et recherche textuelle ;
- dépôt de liens et fichiers privés ;
- fiche ressource avec likes, sauvegarde, commentaires et signalement ;
- profil étudiant modifiable ;
- schéma Supabase avec RLS, stockage privé et trigger de création de profil ;
- tests de validation et documentation de mise en route.
- page dédiée aux ressources sauvegardées ;
- garde-fou SQL sur les domaines e-mail autorisés ;
- workflow GitHub Actions pour typecheck, lint, tests et build.

## [0.3.0] - 2026-08-12

### Ajouté

- notifications privées lorsqu’un autre étudiant aime ou commente une ressource partagée ;
- badge des notifications non lues dans l’en-tête et page dédiée avec marquage individuel ou global ;
- triggers PostgreSQL et politiques RLS pour garder la création des notifications côté base.

## [0.2.0] - 2026-08-12

### Ajouté

- collections personnelles pour organiser les ressources enregistrées ;
- collection « À lire » créée automatiquement pour chaque étudiant ;
- politiques RLS dédiées aux collections et à leurs ressources.
