# Journal des changements

## [0.5.20] - 2026-08-12

### Parcours étudiant

- gestion des collections personnelles : renommage, suppression confirmée et maintien des compteurs après modification ;
- collection automatique « À lire » protégée par une politique RLS dédiée ;

## [0.5.19] - 2026-08-12

### Découverte

- recherche, type, année, formation et tri conservés dans l’URL pour partager ou retrouver une vue du fil ;

## [0.5.18] - 2026-08-12

### Parcours étudiant

- marquage fiable d’une notification comme lue avant l’ouverture de la ressource associée ;

## [0.5.17] - 2026-08-12

### Parcours étudiant

- messages explicites lorsque l’appréciation, la sauvegarde, le téléchargement ou la suppression d’une ressource échoue ;

## [0.5.16] - 2026-08-12

### Parcours étudiant

- renvoi de l’e-mail de confirmation directement après l’inscription lorsqu’un étudiant n’a pas encore validé son adresse ;

## [0.5.15] - 2026-08-12

### Mainteneur

- journal privé et transactionnel des masquages et republications, avec dernière action visible dans la file de modération ;

## [0.5.14] - 2026-08-12

### Parcours étudiant

- partage d’une fiche par feuille native sur mobile ou copie automatique de son lien canonique sur les autres navigateurs ;

## [0.5.13] - 2026-08-12

### Parcours étudiant

- remplacement du fichier d’une ressource directement depuis sa page d’édition, sans perdre les likes, sauvegardes ou retours associés ;

## [0.5.12] - 2026-08-12

### Parcours étudiant

- retours d’une fiche ressource chargés par pages de 30 avec compteur exact, pour conserver une discussion utilisable lorsqu’elle grandit ;

## [0.5.11] - 2026-08-12

### Parcours étudiant

- sauvegardes chargées par lots de 24 pour éviter une requête qui grossit sans limite ;
- compteurs « Toutes » et par collection calculés séparément, y compris lorsque certaines ressources sauvegardées ne sont plus accessibles ;

## [0.5.10] - 2026-08-12

### Parcours étudiant

- profils membres chargés par lots de 24 partages avec un compteur serveur exact, afin que les anciennes ressources restent accessibles au-delà des 100 premiers éléments ;

## [0.5.9] - 2026-08-12

### Parcours étudiant

- notifications chargées par pages de 30 éléments pour retrouver les interactions anciennes sans limite silencieuse à 50 entrées ;
- filtre « Non lues » appliqué côté base et compteurs exacts affichés pour toutes les notifications et les non-lues ;

## [0.5.8] - 2026-08-12

### Mainteneur

- file de signalements paginée par 50 éléments avec des compteurs exacts par état pour ne plus masquer les signalements au-delà des 100 premiers ;

## [0.5.7] - 2026-08-12

### Mainteneur

- snapshot privé de compteurs agrégés pour suivre les comptes créés, les ressources publiées, les likes et les commentaires sans exposer de données personnelles ;

## [0.5.6] - 2026-08-12

### Découverte

- compteur de likes maintenu par Postgres et tri populaire appliqué avant la pagination pour faire remonter les supports réellement appréciés ;

## [0.5.5] - 2026-08-12

### Découverte

- chargement progressif du fil par pages de 24 ressources pour que les anciens supports restent retrouvables au-delà des 100 premiers résultats ;

## [0.5.4] - 2026-08-12

### Parcours étudiant

- notifications rendues explicites lorsqu’une ressource a été masquée ou n’est plus accessible, sans lien cassé vers sa fiche ;

## [0.5.3] - 2026-08-12

### Mainteneur

- masquage et republication réversibles des ressources directement depuis la file de modération ;
- confirmation avant de masquer une ressource et revalidation des vues concernées après chaque action ;

## [0.5.2] - 2026-08-12

### Sécurité

- lecture des fichiers Storage limitée aux ressources publiées et à leur auteur, y compris lorsque le chemin d’un objet est connu ;

## [0.5.1] - 2026-08-12

### Découverte

- filtre du fil par formation et bouton de réinitialisation pour retrouver rapidement un état de recherche propre ;

## [0.5.0] - 2026-08-12

### Mainteneur

- file privée de modération pour consulter les signalements récents et les faire passer de « à traiter » à « traité » ou « fermé » ;
- accès à la modération limité aux adresses configurées côté serveur, sans exposer la clé de service dans le navigateur ;

### Parcours étudiant

- présentation courte dans le profil et page membre consultable depuis une ressource ;
- ressources publiées regroupées sur chaque profil pour faciliter la confiance et la découverte entre étudiants ;

## [0.4.1] - 2026-08-12

### Sécurité

- signalements ouverts dédoublonnés par ressource et étudiant pour réduire le bruit de modération.

## [0.4.0] - 2026-08-12

### Ajouté

- récupération de compte par e-mail et changement de mot de passe depuis un lien sécurisé ;
- modification ou suppression de ses propres commentaires depuis une fiche ressource, avec indication des commentaires modifiés ;
- édition des métadonnées d’une ressource par son auteur, en conservant le fichier, les likes, les sauvegardes et les commentaires ;
- validation cohérente des fichiers partagés (taille maximale et formats autorisés) avant l’envoi ;
- navigation clavier améliorée avec lien de saut, focus visible et respect des préférences de mouvement réduit ;
- navigation mobile conservée sur deux lignes, avec accès aux ressources enregistrées et au profil sans débordement de l’en-tête ;
- filtre « Toutes / Non lues » dans la page notifications pour retrouver rapidement les retours à traiter ;
- snapshot d’adoption documenté avec définitions de métriques et formulaire public de feedback étudiant ;
- appel public aux retours étudiants ouvert sur GitHub, sans fabriquer de témoignages ni de métriques d’usage ;
- CI déclenchable manuellement et exécutée aussi sur les pull requests vers la branche de travail `codex/**` ;
- configuration Dependabot ajoutée pour surveiller npm chaque semaine et les GitHub Actions chaque mois ;

### Sécurité

- callback d’authentification limité aux chemins internes pour éviter les redirections externes ;
- années d’étude contrôlées côté validation et base de données pour éviter des filtres incohérents.

### Découverte

- tri du fil par ressources récentes ou les plus appréciées ;
- comptage des likes affiché dans les cartes et recherche temporisée pour éviter une requête à chaque touche.

### Parcours étudiant

- indicateur de complétude du profil sur le tableau de bord avec lien direct vers les champs à renseigner.

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
