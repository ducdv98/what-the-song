#!/bin/sh
#
# Generates the optional basic_auth snippet, then hands off to Caddy.
#
# A Caddyfile cannot conditionally include a directive, and basic_auth needs a
# bcrypt hash at parse time, so the snippet is written here instead.
set -eu

AUTH_FILE=/etc/caddy/auth.caddy
: > "$AUTH_FILE"

if [ -n "${AUTH_USER:-}" ] && [ -n "${AUTH_PASSWORD:-}" ]; then
	HASH="$(caddy hash-password --plaintext "$AUTH_PASSWORD")"
	printf 'basic_auth {\n\t%s %s\n}\n' "$AUTH_USER" "$HASH" > "$AUTH_FILE"
	echo "auth: enabled for user '${AUTH_USER}'"
else
	echo "auth: DISABLED — fine on localhost, but set AUTH_USER and"
	echo "auth: AUTH_PASSWORD before sharing this URL with anyone."
fi

if [ ! -f /srv/assets/songs/catalogue.json ]; then
	echo "assets: no catalogue.json found at /srv/assets/songs"
	echo "assets: build one on the host first:"
	echo "assets:   ./tools/ingest.py seed.jsonl --out apps/web/public/assets/songs"
fi

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
