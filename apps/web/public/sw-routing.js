// Keep the allowlist narrow: all API, catalogue and media requests use the network.
self.classifyRequest = function classifyRequest(rawUrl, mode, origin) {
  const url = new URL(rawUrl);
  if (url.origin !== origin) return 'network';
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/clips/') || url.pathname.endsWith('/catalogue.json')) return 'network';
  if (mode === 'navigate') return 'navigation';
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) return 'static';
  return 'network';
};
