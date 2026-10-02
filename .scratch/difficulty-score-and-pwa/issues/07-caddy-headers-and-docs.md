# Caddy headers and PWA docs

Status: done
Blocked by: 04, 05

See `spec.md` (PWA: Server headers, Docs).

Serve the PWA files correctly.

In the Caddyfile, serve the service worker and manifest with no long-term cache (worker as JavaScript), behind the same optional basic-auth gate; make the manifest link send credentials so install works with the gate on. Keep all other caching rules. Add a short doc: how the PWA is wired, regenerating icons, bumping the cache version, and the never-cache API/assets rule.

## Done when
- With the stack running, the worker and manifest return no-cache headers and still work with AUTH_USER/AUTH_PASSWORD set (manual).
- Existing asset and catalogue caching is unchanged.
- The doc exists and is linked from the README.
