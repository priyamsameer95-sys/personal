// The live portfolio publishes through Next.js. This archived service must
// never provide a second, unauthenticated path for changing content.
export const LEGACY_BACKEND_HOST = '127.0.0.1';

export function blockLegacyMutations(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();

  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  return res.status(410).json({
    error: 'This archived backend is read-only. Use the authenticated website CMS to publish content.',
  });
}
