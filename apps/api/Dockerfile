# Build context: repo root (monorepo, shares packages/*).
FROM node:26-alpine AS build
RUN npm i -g pnpm@12.16.1
WORKDIR /app
# Dependency layer cached on the lockfile only.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @bp/api... \
 && pnpm --filter @bp/api build \
 && pnpm --filter @bp/api deploy --prod /out
# ponytail: deploy copies @bp/shared into node_modules as .ts; compile shared to JS once the API imports it.

FROM node:26-alpine
ENV NODE_ENV=production API_PORT=3000
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
# Pre-create volume mount points so named volumes inherit the non-root owner.
RUN mkdir -p /data/archives /data/backup && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT}/health" > /dev/null || exit 1
CMD ["node", "dist/server.js"]
