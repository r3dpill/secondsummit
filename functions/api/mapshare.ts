/**
 * GET /api/mapshare — server-side proxy for the Garmin inReach MapShare KML.
 *
 * Garmin does not send CORS headers, so the browser cannot fetch the feed
 * directly; the old site solved this with /garmin-proxy.php and this is the
 * same job on the new stack.
 *
 * The response is cached for four minutes. The tracker polls every five, and
 * the inReach only reports every ten, so this caps how often Garmin is asked
 * no matter how many people are watching — which on a walk day is the point.
 */

interface Env {
  /** Overrides the MapShare feed, e.g. to point at a test account. */
  MAPSHARE_URL?: string;
}

const DEFAULT_FEED = 'https://share.garmin.com/Feed/Share/tobywise';
const CACHE_SECONDS = 240;

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const feed = (env.MAPSHARE_URL || DEFAULT_FEED).trim();

  // Garmin's feed accepts a d1 parameter to limit how far back it looks;
  // without it the KML grows for the length of the expedition.
  const since = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString().slice(0, 19) + 'Z';
  const url = `${feed}${feed.includes('?') ? '&' : '?'}d1=${encodeURIComponent(since)}`;

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { 'User-Agent': 'secondsummit.uk tracker' },
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    } as RequestInit);
  } catch {
    return new Response('<kml/>', {
      status: 502,
      headers: { 'Content-Type': 'application/vnd.google-earth.kml+xml', 'Cache-Control': 'no-store' },
    });
  }

  if (!upstream.ok) {
    // Hand back empty KML rather than an error page: the tracker treats it as
    // "no new position" and keeps the last one on screen.
    return new Response('<kml/>', {
      status: 502,
      headers: { 'Content-Type': 'application/vnd.google-earth.kml+xml', 'Cache-Control': 'no-store' },
    });
  }

  const response = new Response(await upstream.text(), {
    headers: {
      'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  });

  await cache.put(cacheKey, response.clone());
  return response;
};
