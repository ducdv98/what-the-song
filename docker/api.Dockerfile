# syntax=docker/dockerfile:1
#
# The account service (apps/api).
# Build from the repo root:  docker build -f docker/api.Dockerfile .

FROM node:22-alpine AS base
WORKDIR /app

# ── Stage 1: cut the monorepo down to @wts/api and what it depends on ────────
FROM base AS prune
RUN npm install -g turbo@^2.11.5
COPY . .
RUN turbo prune @wts/api --docker

# ── Stage 2: compile, then drop dev dependencies ─────────────────────────────
FROM base AS build
COPY --from=prune /app/out/json/ .
RUN npm ci
COPY --from=prune /app/out/full/ .
COPY tsconfig.base.json ./
# Builds @wts/core and @wts/contracts first, then the API.
RUN npx turbo run build --filter=@wts/api && npm prune --omit=dev

# ── Stage 3: run ─────────────────────────────────────────────────────────────
FROM node:22-alpine
ENV NODE_ENV=production

# The pruned workspace: root node_modules plus the built packages the API
# imports through their workspace links.
COPY --from=build --chown=node:node /app /app
WORKDIR /app/apps/api

# Stateless: everything durable is in Postgres, so any number of these can run
# side by side behind the proxy.
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:4000/api/health >/dev/null || exit 1

CMD ["node", "dist/main.js"]
