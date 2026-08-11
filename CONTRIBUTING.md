# Contribuer à Passerelle

Merci de vouloir améliorer l’entraide entre étudiants. Une contribution peut être du code, une correction de texte, une amélioration d’accessibilité ou un retour concret sur l’usage de l’application.

## Avant de commencer

- cherchez une issue existante avant d’en ouvrir une nouvelle ;
- décrivez le problème avec un exemple reproductible ;
- ne commitez jamais `.env.local`, une clé Supabase ou un fichier étudiant réel ;
- gardez une modification ciblée et testable.

## Développement

```bash
npm install
cp .env.example .env.local
npm run dev
```

Avant une pull request, lancez `npm run typecheck`, `npm run lint`, `npm run test` et `npm run build`. Une pull request doit expliquer le comportement observé avant et après la modification, ainsi que les éventuels changements SQL à appliquer dans Supabase.

## Données et confidentialité

Les fixtures de test ne doivent contenir aucune adresse e-mail personnelle, aucun document de cours soumis à une restriction de diffusion et aucune donnée permettant d’identifier un étudiant réel. Les changements de politiques RLS doivent être relus avec attention.

