# Battery Passport – PoC hackathon ESILV × Capgemini Engineering (défi 6)

Tu es l'agent de développement de ce monorepo. Lis ce fichier en entier, puis lis les docs
indiquées **à la demande** (ne charge pas tout d'un coup).

## Le projet en 5 lignes
- PoC d'un « Digital Battery Passport » (BP) pour batteries de véhicules électriques.
- Hackathon de 2 jours, équipe de 7. Le PoC doit être démontrable en 2-3 minutes.
- Cas d'usage global : le garagiste scanne un QR code, constate un défaut critique, demande le
  passage du BP en `Waste` ; le propriétaire du BP (constructeur) valide ; le centre de tri scanne
  le QR et constate que le statut est à jour.
- **Défi choisi : n°6 – archivage des données en fin de vie** : cycle de vie du BP, règles
  d'archivage, cas d'usage `Prepare for Archive` et `Create New BP from Old`, traçabilité, RGPD.
- Base de données : graphe **Neo4j**. Aucun dump fourni : le schéma est le nôtre (`docs/04`, ADR 0001).

## Stack (voir `docs/07-architecture.md`)
- Monorepo **pnpm workspaces** : `apps/api`, `apps/web`, `packages/shared`, `infra/`, `docs/`.
- API : Node (LTS) + TypeScript + Fastify + `neo4j-driver` + zod.
- Front : Nuxt 4 (Vue 3, TypeScript, SPA statique servie par Caddy) + Tailwind + Pinia. Interface en **français**.
- Docker + docker compose. CI/CD GitHub Actions : sur `main`, build des images, push sur GHCR,
  déploiement SSH sur un VPS (voir `docs/08-devops.md`).

## Commandes
```bash
pnpm install
docker compose up -d neo4j                      # base locale
pnpm --filter @bp/api seed                      # données de démo
pnpm dev                                        # api + web en parallèle
pnpm lint && pnpm typecheck && pnpm test        # à lancer avant chaque commit
pnpm build
docker compose -f docker-compose.prod.yml config   # valider le compose de prod
```

## Où trouver quoi (lis à la demande)
| Sujet | Fichier |
|---|---|
| Contexte, périmètre, livrables du hackathon | `docs/00-context.md` |
| Rôles, user stories, critères d'acceptation, script de démo | `docs/01-product-spec.md` |
| Statuts, transitions, règles de changement de statut | `docs/02-lifecycle-and-status-rules.md` |
| Règles d'archivage, durées, pseudonymisation, purge | `docs/03-archive-rules.md` |
| Modèle de données Neo4j (existant + extensions), Cypher | `docs/04-data-model-neo4j.md` |
| Contrat d'API REST | `docs/05-api-spec.md` |
| Écrans, parcours par rôle, composants | `docs/06-frontend-spec.md` |
| Architecture, structure du repo, variables d'environnement | `docs/07-architecture.md` |
| Docker, CI/CD, VPS, secrets, rollback | `docs/08-devops.md` |
| Backlog ordonné avec critères d'acceptation | `docs/09-backlog.md` |
| Façon de travailler, définition de « terminé » | `docs/10-agent-workflow.md` |
| Conformité (RGPD, ISO, règlement batteries) | `docs/11-compliance-notes.md` |
| Hypothèses faites et questions ouvertes | `docs/12-assumptions-and-open-questions.md` |

## Règles non négociables
1. **Suis `docs/09-backlog.md` dans l'ordre.** Une tâche = une branche = une PR courte.
2. **Ne pousse jamais directement sur `main`** : `main` déclenche un déploiement en production.
3. **Aucun secret dans git** (mots de passe, clés SSH, tokens, `.env*` réels). Utilise
   `.env.example` pour documenter les variables.
4. **Les règles métier vivent côté API**, jamais seulement dans le front. Les transitions de
   statut sont définies une seule fois dans `packages/shared` et réutilisées partout.
5. **Un changement de statut = un `StatusEvent` immuable.** Ne modifie jamais un événement existant.
6. **Neo4j n'est jamais exposé publiquement** (ni 7474, ni 7687) en production.
7. **Le schéma de référence est `docs/04-data-model-neo4j.md`** (base : figure 1 du sujet). Toute modification
   du schéma passe par une migration dans `apps/api/src/db/migrations/` et une mise à jour de `docs/04`.
8. **Si une consigne est ambiguë ou si tu dois faire un choix qui n'est pas documenté, pose
   la question avant d'implémenter**, puis consigne la décision dans `docs/decisions/`.
9. Les propositions de l'équipe (statut `Archived`, durées d'archivage, seuils) sont des
   **choix de PoC, pas des exigences réglementaires**. Ne les présente jamais comme légales.
10. Code, identifiants, commentaires et messages de commit en **anglais** ; textes de l'interface
    et documentation en **français**.

## Définition de « terminé » (résumé)
Tests passants, lint et typecheck OK, critères d'acceptation de la tâche vérifiés, docs mises
à jour si une décision a changé, PR ouverte avec description. Détail : `docs/10-agent-workflow.md`.
