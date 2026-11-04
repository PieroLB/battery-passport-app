# 0002 – Nuxt 4 et front statique servi par Caddy

Date : 2026-11-04 · Statut : acceptée

## Contexte
La doc initiale prévoyait Nuxt 3 et un conteneur `web` (serveur Node de Nuxt) derrière un conteneur Caddy.
Nuxt 3 n'est plus la version courante. Le front est une SPA (`ssr: false`) : aucun rendu serveur n'est nécessaire.

## Options
1. Nuxt 3 + conteneur Node `web` + conteneur `caddy` (doc initiale).
2. Nuxt 4, `nuxt generate`, fichiers copiés sur le VPS et montés dans Caddy.
3. Nuxt 4, `nuxt generate`, fichiers **embarqués dans une image Caddy** versionnée.

## Décision
Option 3. L'image `battery-passport-web` est construite en deux étapes : Node (`nuxt generate`), puis `caddy:2`
avec `.output/public` dans `/srv` et `infra/caddy/Caddyfile`. Ce conteneur est aussi le reverse proxy (`/api/*` → api).

## Conséquences
- Un conteneur et un runtime Node en moins en production ; plus de copie du Caddyfile au déploiement.
- Front, Caddyfile et API partagent le même tag d'image : le retour arrière (`IMAGE_TAG`) reste cohérent
  (raison du rejet de l'option 2, où les fichiers statiques ne suivraient pas le tag).
- Toujours deux images (api, web) dans la CI.
- Nuxt 4 : sources du front dans `apps/web/app/`.
- En dev, `/api` est redirigé vers l'API locale par `nitro.devProxy` (préfixe retiré).
