import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The clip library and catalogue are produced locally by tools/ingest.py and
  // served as static files, so there is nothing to build server-side.
  // `output: 'export'` keeps deployment to "copy a folder somewhere private".
  output: 'export',
};

export default config;
