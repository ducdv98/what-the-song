import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The clip library and catalogue are produced locally by tools/ingest.py and
  // served as static files, so there is nothing to build server-side.
  // `output: 'export'` keeps deployment to "copy a folder somewhere private".
  output: 'export',
};

// In development only, forward the leaderboard API to `npm run scores`, the
// way Caddy does in production. A static export cannot carry rewrites, so the
// production build must not see this at all. Next warns that rewrites do not
// work with `output: export` — true of the build, but they do apply in dev.
if (process.env.NODE_ENV === 'development') {
  const upstream = process.env.SCORES_URL ?? 'http://localhost:8787';
  config.rewrites = async () => [{ source: '/api/:path*', destination: `${upstream}/api/:path*` }];
}

export default config;
