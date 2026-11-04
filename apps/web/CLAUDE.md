# apps/web – consignes spécifiques

- Nuxt 3, SPA (`ssr: false`), TypeScript, Tailwind, Pinia. Interface en français.
- Une seule application, **plusieurs layouts selon le rôle** : tablette (garagiste), desktop
  (propriétaire du BP, conformité), mobile (centre de tri, recycleur). Voir `docs/06-frontend-spec.md`.
- Appels API via un composable unique `useApi()` qui ajoute le JWT et gère les erreurs.
  L'URL de base est `/api` (le reverse proxy route `/api/*` vers l'API).
- Le front **n'implémente aucune règle métier** : il affiche ce que l'API autorise
  (`allowedActions` renvoyées par l'API) et affiche les messages d'erreur de l'API.
- Scan QR : `html5-qrcode` (caméra) + saisie manuelle de l'identifiant en secours.
- Accessibilité : contrastes suffisants, libellés de formulaires, cibles tactiles ≥ 44 px
  sur mobile et tablette.
