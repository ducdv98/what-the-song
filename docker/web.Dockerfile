# syntax=docker/dockerfile:1
#
# The game: a static export served by Caddy, which also proxies /api.
# Build from the repo root:  docker build -f docker/web.Dockerfile .

FROM node:22-alpine AS base
WORKDIR /app

# ── Stage 1: cut the monorepo down to @wts/web and what it depends on ────────
FROM base AS prune
RUN npm install -g turbo@^2.11.5
COPY . .
RUN turbo prune @wts/web --docker

# ── Stage 2: build the static export ─────────────────────────────────────────
FROM base AS build
ARG SITE_URL
ENV SITE_URL=$SITE_URL
# Manifests and lockfile first, so editing source does not invalidate the
# dependency layer.
COPY --from=prune /app/out/json/ .
RUN npm ci
COPY --from=prune /app/out/full/ .
# Shared compiler settings; turbo prune only carries workspace directories.
COPY tsconfig.base.json ./
# Turbo builds the Topic packages, @wts/core, @wts/topics and @wts/contracts first.
# next.config.ts sets output: 'export', so this writes a fully static site to
# apps/web/out — no Node process is needed to serve it.
RUN npx turbo run build --filter=@wts/web

# ── Stage 3: serve it ────────────────────────────────────────────────────────
FROM caddy:2-alpine

COPY --from=build /app/apps/web/out /srv/site
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The clip library is mounted from the host at runtime and deliberately not
# baked in: it is far larger than the app, it changes every time you ingest
# more songs, and audio should not end up inside a distributable image.
VOLUME /srv/assets

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
