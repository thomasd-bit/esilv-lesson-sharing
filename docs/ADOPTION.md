# Mesure de l’adoption

Ce document sépare les signaux publics vérifiables des hypothèses. Une étoile GitHub n’est pas un utilisateur actif, et l’absence d’une métrique ne vaut pas zéro.

## Snapshot public — 12 août 2026

Source : [API publique du dépôt](https://api.github.com/repos/thomasd-bit/esilv-lesson-sharing), consultée le 12 août 2026.

| Signal | Valeur observée | Lecture prudente |
| --- | ---: | --- |
| Étoiles GitHub | 3 | intérêt public initial, pas une mesure d’usage ; |
| Forks | 0 | aucun fork public observé ; |
| Issues ouvertes | 0 au moment du snapshot | aucun besoin public en attente ; |
| Contributeurs listés | 1 | le projet n’a pas encore de contribution externe vérifiable ; |
| Releases publiées | 2 (`v0.1.0`, `v0.4.0`) | deux versions installables et documentées ; |
| Assets de release téléchargeables | 0 | l’application est publiée comme code source, pas comme binaire ; |
| Téléchargements de release | non disponible | aucun compteur d’asset à interpréter ; |
| Dépendants GitHub | non disponible | le dépôt n’est pas une dépendance packagée. |

Le dépôt expose aussi la [PR initiale fusionnée](https://github.com/thomasd-bit/esilv-lesson-sharing/pull/1) et la [release `v0.4.0`](https://github.com/thomasd-bit/esilv-lesson-sharing/releases/tag/v0.4.0). Ces éléments prouvent une activité de maintenance, pas encore une adoption par la promo.

## Mesures produit à suivre dès qu’un environnement est utilisé

- comptes confirmés avec domaine étudiant, sans enregistrer le contenu des messages ni les mots de passe ;
- ressources publiées, ressources enregistrées et commentaires créés par semaine ;
- part des ressources qui reçoivent au moins un like, une sauvegarde ou un commentaire ;
- erreurs d’upload et signalements ouverts/résolus ;
- retours qualitatifs issus du [formulaire public de feedback](https://github.com/thomasd-bit/esilv-lesson-sharing/issues/new?template=student-feedback.yml).

Ces indicateurs doivent être exportés avec une date, une définition et une période. Les données personnelles ne sont pas nécessaires pour mesurer l’utilité du produit.

## Boucle de feedback

Le premier test utile consiste à faire essayer Passerelle à quelques étudiants de formations et d’années différentes, puis à leur demander :

1. Ont-ils trouvé un support utile en moins d’une minute ?
2. Qu’est-ce qui les a empêchés de publier ou d’enregistrer une ressource ?
3. Quelle information manquait dans la fiche ou le profil ?

Chaque retour exploitable doit rester identifiable par un lien d’issue ou une note datée. Aucun retour utilisateur n’est déclaré ici tant qu’il n’a pas été réellement reçu.
