import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const base: NextConfig = {
  reactStrictMode: true,
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // In development the account API (apps/api, NestJS) runs as its own process;
    // proxy /api to it so the browser sees one origin, exactly as it does
    // behind Caddy in production. `npm run dev` starts both.
    const api = process.env.API_URL ?? 'http://127.0.0.1:4000';
    return {
      ...base,
      rewrites: async () => [{ source: '/api/:path*', destination: `${api}/api/:path*` }],
    };
  }
  // The Songs assets (/assets/songs: clips and catalogue) are produced locally by tools/ingest.py and
  // served as static files, and accounts live in a separate service (apps/api), so
  // the web app itself still builds to plain files. `output: 'export'` keeps
  // that part of deployment to "copy a folder somewhere private".
  return { ...base, output: 'export' };
}
