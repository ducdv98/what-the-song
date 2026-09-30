# syntax=docker/dockerfile:1

# ── Stage 1: build the static export ─────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies first, so editing source does not invalidate the npm layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json next.config.ts ./
COPY app ./app
COPY lib ./lib
COPY public ./public

# next.config.ts sets output: 'export', so this writes a fully static site to
# out/ — no Node process is needed to serve it.
RUN npm run build

# ── Score service (target: scores) ───────────────────────────────────────────
# The leaderboard is the one thing a static site cannot hold, so it gets a
# small Node server of its own: no dependencies, so no npm install, just the
# TypeScript run directly. docker-compose.yml builds it with `target: scores`;
# a plain `docker build` still ends at the static site below.
FROM node:22-alpine AS scores

WORKDIR /app
COPY lib ./lib
COPY server ./server

# Created here so a fresh named volume inherits the node user's ownership.
RUN mkdir /data && chown node:node /data
VOLUME /data
ENV SCORES_FILE=/data/scores.jsonl
USER node

EXPOSE 8787
CMD ["node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "server/scores.ts"]

# ── Stage 2: serve it ────────────────────────────────────────────────────────
FROM caddy:2-alpine AS web

COPY --from=build /app/out /srv/site
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The clip library is mounted from the host at runtime and deliberately not
# baked in: it is far larger than the app, it changes every time you ingest
# more songs, and audio should not end up inside a distributable image.
VOLUME /srv/clips

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
