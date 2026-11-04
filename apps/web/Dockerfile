# Build context: repo root. Static SPA embedded in a Caddy image (ADR 0002).
FROM node:26-alpine AS build
RUN npm i -g pnpm@12.16.1
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @bp/web... \
 && pnpm --filter @bp/web build

FROM caddy:2-alpine
# The official binary already has cap_net_bind_service, so 80/443 work as non-root.
RUN addgroup -S app && adduser -S -G app app \
 && mkdir -p /data /config && chown app:app /data /config
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/.output/public /srv
USER app
