# 0003 – Versions de la chaîne d'outils

Date : 2026-11-04 · Statut : acceptée

## Contexte
La doc initiale citait Node 22 ou 24 et `corepack enable` pour pnpm. En novembre 2026 :
- Node 26 est la LTS active ; **corepack n'est plus livré avec Node** depuis la v25.
- TypeScript 7 (compilateur natif) est sorti, mais `typescript-eslint` 8 ne supporte que TypeScript `< 6.1`.

## Décision
- Node **26** (`.nvmrc`, `engines`, images `node:26-alpine`).
- pnpm **12.16.1**, épinglé dans `packageManager`. En CI : `pnpm/action-setup` lit ce champ.
  Dans les Dockerfiles : `npm i -g pnpm@12.16.1`.
- TypeScript **~6.0** tant que `typescript-eslint` (et Nuxt) ne supportent pas la v7.
- ESLint 10 (config « flat »), Prettier 3, vitest 5.

## Conséquences
- Passer à TypeScript 7 = une PR dédiée quand `pnpm peers check` est propre.
- Toute montée de version de pnpm se fait dans `packageManager` et dans les Dockerfiles en même temps.
