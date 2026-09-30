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

# ── Stage 2: serve it ────────────────────────────────────────────────────────
FROM caddy:2-alpine

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
