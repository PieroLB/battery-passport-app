# 08 – Docker, CI/CD et déploiement VPS

Objectif : **chaque merge sur `main` déclenche** CI → build des images → push sur GHCR → déploiement SSH sur le VPS,
avec contrôle de santé et retour arrière. L'agent crée les fichiers ci-dessous ; les exemples sont des **cibles**
à adapter (vérifier les versions majeures récentes des actions GitHub et des images avant de les figer).

## Fichiers à créer
```
apps/api/Dockerfile        apps/web/Dockerfile        .dockerignore
docker-compose.yml         docker-compose.prod.yml    infra/caddy/Caddyfile
.github/workflows/ci.yml   .github/workflows/deploy.yml
infra/scripts/bootstrap-vps.md   infra/scripts/backup.sh (optionnel)
```

## Dockerfiles (exigences)
- Multi-étapes (build puis runtime), **contexte = racine du repo** (le monorepo partage `packages/shared`).
- Image de base Node LTS alpine, **même version que `.nvmrc`** ; corepack n'est plus livré avec Node 26 : `npm i -g pnpm@<version de packageManager>` (ADR 0003).
- `pnpm install --frozen-lockfile` ; ne copier dans l'image finale que le nécessaire (`dist`, dépendances de production).
  API : `pnpm --filter @bp/api deploy --prod /out` (≈ 40 Mo de dépendances, image ≈ 300 Mo). Un `--filter --prod`
  classique embarque tout le workspace (≈ 630 Mo). Quand l'API importera `@bp/shared`, il faudra compiler `shared`
  en JS : Node ne retire pas les types des fichiers `.ts` situés dans `node_modules`.
- Test local de la stack de prod : `.env.production` temporaire avec `DOMAIN=:80`, images taguées `local`, puis
  `docker compose -p bp-local --env-file .env.production -f docker-compose.prod.yml up -d` (et `down -v` ensuite, en local uniquement).
- Utilisateur **non-root**, `NODE_ENV=production`, `HEALTHCHECK` sur `/health` (api).
- Web (ADR 0002) : étape de build Node → `nuxt generate` ; étape finale `FROM caddy:2` qui copie
  `.output/public` dans `/srv` et `infra/caddy/Caddyfile` dans `/etc/caddy/Caddyfile`. Pas de Node à l'exécution.
- `.dockerignore` : `node_modules`, `.git`, `.env*`, `neo4j/dump`, `docs`, `dist`, `.nuxt`.

## `docker-compose.yml` (développement)
```yaml
services:
  neo4j:
    image: neo4j:${NEO4J_IMAGE_TAG:-5-community}      # même version majeure que le dump
    ports: ["127.0.0.1:7474:7474", "127.0.0.1:7687:7687"]
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-devpassword}
    volumes: [neo4j_data:/data]
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p \"$${NEO4J_AUTH#neo4j/}\" 'RETURN 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12

  neo4j-restore:            # restauration ponctuelle du dump fourni (voir procédure)
    image: neo4j:${NEO4J_IMAGE_TAG:-5-community}
    profiles: [restore]
    volumes:
      - neo4j_data:/data
      - ./neo4j/dump:/dump:ro
    entrypoint: ["neo4j-admin","database","load","neo4j","--from-path=/dump","--overwrite-destination=true"]

volumes:
  neo4j_data:
```
**Important** : ne pas passer `NEO4J_PASSWORD`, `NEO4J_USER` ou `NEO4J_URI` en variables d'environnement au conteneur
Neo4j : l'image convertit les variables `NEO4J_*` en paramètres de configuration et peut refuser les clés inconnues.
Seul `NEO4J_AUTH` (et les paramètres `NEO4J_server_*`) doivent y figurer.

### Restaurer le dump (dev)
1. Placer le dump dans `neo4j/dump/` et le **renommer `neo4j.dump`** (le nom doit être `<nom-de-base>.dump`).
2. `docker compose stop neo4j` (la base doit être arrêtée), puis
   `docker compose --profile restore run --rm neo4j-restore`, puis `docker compose up -d neo4j`.
3. Vérifier la version : si le dump vient d'une version différente de Neo4j (ex. 4.4 vers 5), la restauration peut
   exiger une **migration de format** (`neo4j-admin database migrate`). Aligner `NEO4J_IMAGE_TAG` sur la version du dump
   ou consigner la procédure dans `docs/decisions/`.

## `docker-compose.prod.yml` (VPS)
```yaml
services:
  web:                      # Caddy + SPA statique + Caddyfile, tout dans l'image (ADR 0002)
    image: ghcr.io/${GHCR_OWNER}/battery-passport-web:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    environment:
      DOMAIN: ${DOMAIN}
    volumes:
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [api]

  api:
    image: ghcr.io/${GHCR_OWNER}/battery-passport-api:${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file: .env.production
    environment:
      NEO4J_URI: bolt://neo4j:7687
      API_PORT: "3000"
    volumes:
      - archives:/data/archives
      - archives_backup:/data/backup
    depends_on:
      neo4j: { condition: service_healthy }

  neo4j:
    image: neo4j:${NEO4J_IMAGE_TAG:-5-community}
    restart: unless-stopped
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_server_memory_heap_initial__size: 512m
      NEO4J_server_memory_heap_max__size: 512m
      NEO4J_server_memory_pagecache_size: 256m
    volumes: [neo4j_data:/data]
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p \"$${NEO4J_AUTH#neo4j/}\" 'RETURN 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
    # AUCUN port publié : Neo4j reste sur le réseau Docker interne.

  neo4j-restore:
    image: neo4j:${NEO4J_IMAGE_TAG:-5-community}
    profiles: [restore]
    volumes: [neo4j_data:/data, ./neo4j/dump:/dump:ro]
    entrypoint: ["neo4j-admin","database","load","neo4j","--from-path=/dump","--overwrite-destination=true"]

volumes:
  caddy_data:
  caddy_config:
  neo4j_data:
  archives:
  archives_backup:
```
Remarque : la mémoire de Neo4j est bornée ici pour un petit VPS (≥ 2 Go de RAM conseillé). Ajuster selon le VPS.

## `infra/caddy/Caddyfile`
```
{$DOMAIN} {
    encode zstd gzip
    handle_path /api/* {
        reverse_proxy api:3000
    }
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}
```
Le Caddyfile est **copié dans l'image web** au build : une modification du Caddyfile passe par une PR et un
nouveau déploiement, comme le code. `try_files … /index.html` sert la SPA pour toutes les routes (`/p/BP-DEMO-001`…).
HTTPS automatique (Let's Encrypt) si `DOMAIN` est un nom de domaine dont le DNS pointe vers le VPS. Sans domaine,
utiliser `:80` en attendant (et accepter l'absence de HTTPS — la caméra du scanner QR exige HTTPS sur mobile,
sauf `localhost` : **un domaine avec HTTPS est donc nécessaire pour la démo mobile**).

## `.github/workflows/ci.yml`
```yaml
name: CI
on:
  pull_request:
  workflow_call:
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6          # lit "packageManager" dans package.json
      - uses: actions/setup-node@v7
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
  docker-build:
    runs-on: ubuntu-latest
    strategy:
      matrix: { app: [api, web] }
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - uses: docker/build-push-action@v7
        with:
          context: .
          file: apps/${{ matrix.app }}/Dockerfile
          push: false
          cache-from: type=gha,scope=${{ matrix.app }}
          cache-to: type=gha,mode=max,scope=${{ matrix.app }}
```

## `.github/workflows/deploy.yml`
```yaml
name: Deploy
on:
  push:
    branches: [main]
concurrency:
  group: deploy-production
  cancel-in-progress: false
permissions:
  contents: read
jobs:
  ci:
    uses: ./.github/workflows/ci.yml

  build-and-push:
    needs: ci
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix: { app: [api, web] }
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v6      # met le nom d'image en minuscules
        with:
          images: ghcr.io/${{ github.repository_owner }}/battery-passport-${{ matrix.app }}
          tags: |
            type=sha,prefix=sha-,format=short
            type=raw,value=latest
      - uses: docker/build-push-action@v7
        with:
          context: .
          file: apps/${{ matrix.app }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=${{ matrix.app }}
          cache-to: type=gha,mode=max,scope=${{ matrix.app }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      packages: read
    env:
      VPS_HOST: ${{ secrets.VPS_HOST }}
      VPS_USER: ${{ secrets.VPS_USER }}
      VPS_PORT: ${{ secrets.VPS_PORT }}
      VPS_DOMAIN: ${{ secrets.VPS_DOMAIN }}
      SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
      GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      GHCR_USER: ${{ github.actor }}
      OWNER: ${{ github.repository_owner }}
    steps:
      - uses: actions/checkout@v7
      - name: Prepare SSH
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id_deploy && chmod 600 ~/.ssh/id_deploy
          ssh-keyscan -p "${VPS_PORT:-22}" "$VPS_HOST" >> ~/.ssh/known_hosts   # idéal : épingler la clé d'hôte dans un secret
      - name: Copy compose file
        run: |
          scp -i ~/.ssh/id_deploy -P "${VPS_PORT:-22}" docker-compose.prod.yml "$VPS_USER@$VPS_HOST:/opt/battery-passport/"
      - name: Deploy
        run: |
          TAG="sha-${GITHUB_SHA::7}"
          OWNER_LC="$(echo "$OWNER" | tr '[:upper:]' '[:lower:]')"
          SSH="ssh -i $HOME/.ssh/id_deploy -p ${VPS_PORT:-22} $VPS_USER@$VPS_HOST"
          echo "$GHCR_TOKEN" | $SSH "docker login ghcr.io -u $GHCR_USER --password-stdin"
          $SSH "cd /opt/battery-passport && PREV=\$(cat .current_tag 2>/dev/null || echo none) && echo \$PREV > .previous_tag \
            && IMAGE_TAG=$TAG GHCR_OWNER=$OWNER_LC docker compose --env-file .env.production -f docker-compose.prod.yml pull \
            && IMAGE_TAG=$TAG GHCR_OWNER=$OWNER_LC docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans"
      - name: Health check
        run: curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors "https://$VPS_DOMAIN/api/health"
      - name: Mark release as current
        if: success()
        run: |
          SSH="ssh -i $HOME/.ssh/id_deploy -p ${VPS_PORT:-22} $VPS_USER@$VPS_HOST"
          $SSH "echo sha-${GITHUB_SHA::7} > /opt/battery-passport/.current_tag"
      - name: Roll back on failure
        if: failure()
        run: |
          SSH="ssh -i $HOME/.ssh/id_deploy -p ${VPS_PORT:-22} $VPS_USER@$VPS_HOST"
          OWNER_LC="$(echo "$OWNER" | tr '[:upper:]' '[:lower:]')"
          $SSH "cd /opt/battery-passport && PREV=\$(cat .previous_tag) && [ \"\$PREV\" != none ] \
            && IMAGE_TAG=\$PREV GHCR_OWNER=$OWNER_LC docker compose --env-file .env.production -f docker-compose.prod.yml up -d" || true
      - name: Docker logout on VPS
        if: always()
        run: ssh -i "$HOME/.ssh/id_deploy" -p "${VPS_PORT:-22}" "$VPS_USER@$VPS_HOST" "docker logout ghcr.io" || true
```
Notes : le premier déploiement n'a pas de `.current_tag` (retour arrière sans objet). Si `main` est protégé, exiger
la CI sur les PR. Le job `deploy` utilise l'environnement GitHub `production` (possibilité d'ajouter une approbation manuelle).

## Secrets et variables GitHub (à créer)
| Nom | Type | Contenu |
|---|---|---|
| `VPS_HOST` | secret | IP ou nom d'hôte du VPS |
| `VPS_USER` | secret | utilisateur de déploiement (ex. `deploy`) |
| `VPS_PORT` | secret | port SSH (22 par défaut) |
| `VPS_SSH_KEY` | secret | clé **privée** dédiée au déploiement (ed25519) |
| `VPS_DOMAIN` | secret | nom de domaine public (pour le contrôle de santé) |

La clé publique correspondante est dans `~deploy/.ssh/authorized_keys` sur le VPS. Aucune autre valeur sensible
dans GitHub : les secrets applicatifs vivent dans `/opt/battery-passport/.env.production` **sur le VPS**.

## Préparation du VPS (une fois, par un humain)
1. Debian/Ubuntu à jour ; DNS : enregistrement A du domaine vers l'IP du VPS.
2. Installer Docker Engine + plugin compose (méthode officielle de la doc Docker).
3. Créer l'utilisateur `deploy` (ajouté au groupe `docker`), clé SSH publique, connexion par mot de passe désactivée.
4. Pare-feu : n'autoriser que 22, 80, 443 (ex. `ufw`). Neo4j (7474/7687) **jamais** ouvert.
5. `mkdir -p /opt/battery-passport && chown deploy: /opt/battery-passport`.
6. Créer `/opt/battery-passport/.env.production` (`chmod 600`) avec : `DOMAIN`, `NEO4J_PASSWORD`, `JWT_SECRET`,
   `PUBLIC_BASE_URL`, `SEED_DEFAULT_PASSWORD`, `ARCHIVE_DIR=/data/archives`, `ARCHIVE_BACKUP_DIR=/data/backup`,
   `GHCR_OWNER`, seuils (voir `docs/07-architecture.md`).
7. Copier le dump dans `/opt/battery-passport/neo4j/dump/neo4j.dump`, puis (Neo4j arrêté) :
   `docker compose --env-file .env.production -f docker-compose.prod.yml --profile restore run --rm neo4j-restore`.
8. Premier déploiement via un merge sur `main`. Puis lancer le seed **une fois** :
   `docker compose --env-file .env.production -f docker-compose.prod.yml exec api node dist/db/seed.js`
   (adapter le chemin au build réel).

## Retour arrière manuel
```bash
cd /opt/battery-passport
IMAGE_TAG=<tag précédent> GHCR_OWNER=<owner> docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```
Les volumes (`neo4j_data`, `archives`, `archives_backup`) ne sont **jamais** supprimés par un déploiement.

## Interdits sur le VPS
Pas de `docker compose down -v`, pas de `docker volume rm`, pas de `docker system prune --volumes`,
pas de modification manuelle des conteneurs en dehors d'une procédure documentée.

## Sauvegarde (optionnelle, recommandée)
`infra/scripts/backup.sh` : arrêt court de Neo4j, `neo4j-admin database dump neo4j --to-path=<dossier>`, archive des
volumes `archives`, copie hors VPS. À planifier via cron. Le PoC simule la « sauvegarde indépendante » avec `archives_backup`.
