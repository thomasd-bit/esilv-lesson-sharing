# Signaler un problème de sécurité

Ne publiez pas de secret, de jeton, de donnée personnelle ou de preuve d’exploitation dans une issue publique.

Pour signaler une faille, contactez le mainteneur depuis l’adresse indiquée sur le profil GitHub du dépôt avec :

- la page ou le composant concerné ;
- les étapes précises pour reproduire le problème ;
- l’impact observé ;
- une proposition de correction si vous en avez une.

La clé Supabase publishable est conçue pour être utilisée côté navigateur, mais les politiques RLS restent obligatoires. La clé secrète de service Supabase ne doit jamais être exposée dans le client, un commit ou une issue.

Les fichiers du bucket privé `resource-files` ne doivent être lisibles que lorsqu’ils sont liés à une ressource publiée ou par l’auteur de la ressource. Toute modification de cette policy doit conserver ce comportement, y compris pour les ressources masquées.
