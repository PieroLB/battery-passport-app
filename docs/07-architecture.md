# 07 – Architecture

## Vue d'ensemble
```
Navigateur (tablette / desktop / mobile)
        │ HTTPS
   ┌────▼─────┐   /api/*   ┌─────────┐  bolt (réseau Docker interne)  ┌────────┐
   │  Caddy   ├───────────►│   API   ├───────────────────────────────►│ Neo4j  │
   │ (proxy)  │            │ Fastify │                                └────────┘
   │          │   /*       └────┬────┘   volumes : archives, sauvegarde simulée
   │          ├───────────►┌────▼────┐
   └──────────┘            │   Web   │ (Nuxt, SPA servie par Node)
                           └─────────┘
```
Un seul domaine : le front appelle `/api/...` (pas de CORS à gérer en production).

## Structure du monorepo
```
.
├── CLAUDE.md
├── README.md
├── package.json              # scripts racine (dev, build, lint, typecheck, test)
├── pnpm-workspace.yaml
├── .nvmrc                    # version Node (LTS)
├── .env.example
├── docker-compose.yml        # dev : neo4j (+ profil restore)
├── docker-compose.prod.yml   # VPS : caddy, web, api, neo4j
├── apps/
│   ├── api/                  # Fastify + TS
│   │   └── src/{server.ts, config.ts, db/{driver.ts,migrations/,seed.ts}, modules/*, plugins/*}
│   └── web/                  # Nuxt 3
│       ├── nuxt.config.ts, app.vue
│       └── {pages, layouts, components, composables, stores, middleware}
├── packages/
│   └── shared/               # types, zod schemas, STATUS_TRANSITIONS, constantes
├── infra/
│   ├── caddy/Caddyfile
│   └── scripts/              # scripts utilitaires (bootstrap VPS, backup)
├── neo4j/dump/               # dump fourni (voir .gitignore si trop volumineux)
├── docs/
└── .github/workflows/{ci.yml,deploy.yml}
```
Noms de paquets : `@bp/api`, `@bp/web`, `@bp/shared`.

## Choix techniques
| Sujet | Choix | Remarque |
|---|---|---|
| Gestionnaire de paquets | pnpm (workspaces) | épingler la version via `packageManager` dans `package.json` |
| Node | LTS (22 ou 24), épinglée dans `.nvmrc` et dans les Dockerfiles | |
| API | Fastify, zod (`fastify-type-provider-zod` ou équivalent), `neo4j-driver` | |
| Auth | JWT signé (`@fastify/jwt`), mots de passe hachés (argon2 ou bcrypt) | comptes seedés |
| Front | Nuxt 3, Tailwind, Pinia, `html5-qrcode` | SPA |
| QR (génération) | lib `qrcode` côté API | PNG |
| Tests | vitest (api, shared, composants), un test E2E de fumée (curl/script) sur le parcours global | |
| Lint/format | ESLint + Prettier, TypeScript strict | |
| Logs | pino (Fastify), JSON, pas de données sensibles | |

## Variables d'environnement (`.env.example` à créer)
| Variable | Exemple | Utilisée par |
|---|---|---|
| `NODE_ENV` | `development` | api, web |
| `API_PORT` | `4000` en dev, `3000` en prod (interne) | api |
| `NEO4J_URI` | `bolt://localhost:7687` (dev) / `bolt://neo4j:7687` (prod) | api |
| `NEO4J_USER` | `neo4j` | api |
| `NEO4J_PASSWORD` | *(secret)* | api, neo4j |
| `JWT_SECRET` | *(secret, ≥ 32 car.)* | api |
| `JWT_EXPIRES_IN` | `8h` | api |
| `PUBLIC_BASE_URL` | `http://localhost:3000` / `https://<domaine>` | api (QR) |
| `ARCHIVE_DIR` | `/data/archives` | api |
| `ARCHIVE_BACKUP_DIR` | `/data/backup` | api |
| `SEED_DEFAULT_PASSWORD` | *(secret en prod)* | api (seed) |
| `REUSE_MIN_SOH_PERCENT` | `70` | api |
| `REUSE_MAX_RESISTANCE_FACTOR` | `1.0` | api |
| `ARCHIVE_REQUIRES_OWNER_VALIDATION` | `true` | api |
| `DOMAIN` | `bp.exemple.fr` | caddy (prod) |
| `GHCR_OWNER` | `mon-org` (minuscules) | compose prod |
| `IMAGE_TAG` | `sha-abc1234` ou `latest` | compose prod |

Règles : `.env` et `.env.production` ne sont **jamais** commités. `.env.example` ne contient que des valeurs factices.

## Sécurité (minimum PoC)
- Neo4j non exposé hors réseau Docker en production ; mot de passe fort.
- Mots de passe hachés ; JWT à durée limitée ; limitation de débit sur `/auth/login` (`@fastify/rate-limit`).
- Validation zod sur toutes les entrées ; requêtes Cypher **paramétrées** (jamais de concaténation).
- En-têtes de sécurité (`@fastify/helmet` ; côté Caddy : HSTS automatique avec HTTPS).
- Conteneurs en utilisateur non-root, images minimales, pas de secrets dans les images ni les logs.
- Journalisation des accès aux archives (`AccessLog`).
