# 09 – Backlog ordonné

À traiter **dans l'ordre**. Une tâche = une branche (`feat/T-xx-titre`) = une PR courte. Le déploiement
automatique doit fonctionner **très tôt** (M0) pour éviter une mauvaise surprise le dernier jour.

Répartition indicative sur 2 jours : **jour 1 = M0 à M4**, **jour 2 = M5 à M8**.

## M0 – Fondations et déploiement
**T-00 Monorepo**
- pnpm workspace (`apps/*`, `packages/*`), `packageManager` épinglé, `.nvmrc`, TypeScript strict (tsconfig de base),
  ESLint, Prettier, vitest, scripts racine (`dev`, `build`, `lint`, `typecheck`, `test`), `.gitignore`, `.dockerignore`, `.env.example`.
- ✅ `pnpm install && pnpm lint && pnpm typecheck && pnpm test` passent sur un repo vide de logique.

**T-01 Squelette API**
- Fastify, config validée par zod (variables de `docs/07-architecture.md`), pino, `GET /health` (vérifie Neo4j quand dispo).
- ✅ test vitest sur `/health` ; démarre avec `pnpm --filter @bp/api dev`.

**T-02 Squelette Web**
- Nuxt 4 SPA, Tailwind, Pinia, page d'accueil qui appelle `/api/health` et affiche l'état.
- ✅ `pnpm --filter @bp/web build` OK.

**T-03 Docker**
- Dockerfiles api et web, `docker-compose.yml` (dev), `docker-compose.prod.yml`, `infra/caddy/Caddyfile` (voir `docs/08-devops.md`).
- ✅ `docker build` des deux images OK ; `docker compose -f docker-compose.prod.yml config` valide.

**T-04 CI**
- `.github/workflows/ci.yml`.
- ✅ une PR déclenche lint, typecheck, test, build et build Docker sans push.

**T-05 Déploiement**
- `.github/workflows/deploy.yml`, procédure VPS (`infra/scripts/bootstrap-vps.md`).
- ✅ un merge sur `main` met en ligne l'appli ; `https://<domaine>/api/health` répond `ok` ; le retour arrière a été testé une fois.

## M1 – Données
**T-10 Neo4j et dump** : service Neo4j, restauration du dump, **inspection du schéma réel**, ADR `0001-schema-dump.md`.
- ✅ `docs/04-data-model-neo4j.md` mis à jour avec les noms réels.

**T-11 Driver et migrations** : driver partagé, runner de migrations idempotent, contraintes et index.
- ✅ relancer les migrations ne produit aucune erreur ni doublon.

**T-12 Seed** : utilisateurs (5 rôles), modules, batteries `BP-DEMO-001..007`, archives de démo (voir `docs/01-product-spec.md`).
- ✅ seed **idempotent** ; mots de passe issus de `SEED_DEFAULT_PASSWORD` ; hachés en base.

## M2 – Authentification
**T-20 API auth** : `POST /auth/login`, `GET /me`, JWT, décorateur de rôles, limitation de débit sur le login.
- ✅ tests : mauvais mot de passe → 401 ; rôle non autorisé → 403 `FORBIDDEN_ROLE`.

**T-21 Front auth** : page login, store, middleware de route, layouts tablette / desktop / mobile.
- ✅ chaque compte de test arrive sur l'accueil de son rôle.

## M3 – Passeports
**T-30 API lecture** : `GET /passports`, `GET /passports/:id` (avec `allowedActions`), `GET /passports/:id/events`, `GET /passports/:id/qr.png`.
- ✅ `allowedActions` correct par rôle et statut (tests) ; QR encode `PUBLIC_BASE_URL/p/<id>`.

**T-31 Front passeport** : `/p/[id]`, `StatusBadge`, `ModuleCard`, `EventTimeline`, `/scan` (caméra + saisie manuelle).
- ✅ le module hors seuil est signalé (couleur + icône + texte) ; le scan fonctionne sur mobile en HTTPS.

## M4 – Cas d'usage global
**T-40 API demandes de statut** : create / approve / reject, `StatusEvent`, notifications, règles de `docs/02-...`.
- ✅ tests : garagiste ne peut pas changer le statut ; demande dupliquée refusée ; `version` incrémentée ; `VERSION_CONFLICT` testé.

**T-41 Front global** : formulaire garagiste, tableau de bord propriétaire, cloche de notifications.
- ✅ parcours 1 → 3 du script de démo réalisable de bout en bout.

## M5 – Défi 6 : Prepare for Archive
**T-50 API archivage** : `recycling-confirmation`, `archive-requests/:id/validate` (transaction unique : événement, pseudonymisation,
paquet JSON-LD, SHA-256, copie de sauvegarde, `ArchiveRecord`, `retainUntil`, `readOnly`, `qrActive=false`).
- ✅ rollback complet si la génération du paquet échoue ; rejouer la validation ne crée pas de doublon ;
  le paquet ne contient ni nom, ni e-mail, ni téléphone (test).

**T-51 Front archivage** : écran recycleur (certificat), carte « demandes d'archivage » côté propriétaire.
- ✅ parcours 5 → 6 du script de démo ; le QR d'un BP archivé affiche la vue réduite.

## M6 – Create New BP from Old
**T-60 API dérivation** : `POST /passports/:id/derive` (contrôle des seuils par module, duplication, `DERIVED_FROM`,
`REUSES_MODULE`, ancien BP `Archived/SUPERSEDED`, transfert de propriété, notifications) en **une transaction**.
- ✅ tests : module hors seuil refusé avec motifs ; ancien BP jamais archivé `RECYCLED` si un module est réemployé ;
  aucun contact personnel copié.

**T-61 Front dérivation** : écran de décision du centre de tri (modules, statut cible, opérateur, justification).
- ✅ parcours 4 du script de démo ; la filiation est visible sur l'ancien et le nouveau passeport.

## M7 – Consultation et purge
**T-70 API archives** : liste, détail avec **vérification d'intégrité**, filiation, `AccessLog`.
- ✅ altérer le fichier d'archive fait apparaître `integrity.ok = false` ; chaque lecture crée un `AccessLog`.

**T-71 API purge** : `due`, `hold`, `release-hold`, `purge-validation` (double validation), trace minimale.
- ✅ la purge n'a lieu qu'avec les deux validations ; un ancêtre n'est pas purgeable avant ses descendants ;
  `LEGAL_HOLD` bloque la purge.

**T-72 Front archives et conformité** : `/archives/[id]`, `/proprietaire/archives`, `/conformite`.
- ✅ parcours 6 et 7 du script de démo.

## M8 – Finition
**T-80 Test E2E de fumée** : script (ex. Node ou curl) qui rejoue le parcours global + défi 6 contre l'API, lancé en CI.
**T-81 README et démo** : README à jour (pré-requis, étapes, comptes), vérification du script de démo, captures.
**T-82 Revue de sécurité** : checklist de `docs/07-architecture.md` (ports, secrets, Cypher paramétré, rate-limit, rôles sur chaque route).
- ✅ aucune route sans déclaration de rôles ; aucun secret dans l'historique git.

## Hors backlog (ne pas faire sauf demande explicite)
Défis 1 à 5, e-mails, vraie génération PDF/A, signature électronique, vrai prestataire de sauvegarde tiers.
