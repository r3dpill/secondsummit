# Second Summit — project status

## Current state

Last updated: 2026-08-02
Working branch: main
Last commit: `3736bb5` — Stop the About banner cropping Toby's head off
Live at: https://secondsummit.uk (200, TLS valid)
Preview: https://secondsummit.pages.dev
Deploy: GitHub Actions → Cloudflare Pages project `secondsummit`, ~50s per push
Snowdonia page mode: **teaser** (flips to live on the expedition date, 2026-10-05)

Hard deadline: field-tested by **w/c 21 Sep 2026**. Expedition **w/c 5 Oct 2026**.

Recent progress:

- Site live on the real domain; old WordPress install and the `secondsummit.uk` vhost
  removed from Namecheap hosting. `wisecoasttocoast.com` untouched and still serving.
- Coast to Coast archive imported — posts, images, The Walk, Wise Brothers. Zero references
  to the old domain.
- Interactive elevation tracker restored from the old site, live on `/coast-to-coast`.
- Field posting proven in production: `/post` committed a real entry with a photo and it was
  live in 36 seconds. Pages CMS is configured as the independent backup route.
- Dark theme adopted; header, type scale and banners reworked from Toby's review.
- Snowdonia Way teaser published, two states behind one URL.

Waiting on Toby:

- **Snowdonia GPX** — blocks the live tracker entirely. `npm run photos`-style conversion is
  `node scripts/gpx-to-route.mjs`; the overnight markers still need writing by hand.
- **C2C aerial fly-through** — build in AvoMap, upload, send the video ID.
- **His own photographs** — the Snowdonia band is licensed placeholders; `/background` and
  the banners would all be better with his own.
- **Final copy** — every prose block is `[TOBY]` scaffolding.
- **Contact address** to publish (`CONTACT_EMAIL` in `src/site.ts`).

Next planned work:

- Generate Snowdonia route data when the GPX lands, wire the tracker, verify the live state
  renders before the dry run.
- Second phone test of `/post` closer to the expedition, on mobile data.
- Later, separate job: 301 map from `wisecoasttocoast.com` post URLs onto `/posts/...`
  before that domain lapses. Every imported post keeps its old path in `legacyUrl`.

## Where things live

See `README.md` — how Toby posts, how to roll back, the photo pipeline, and the deploy.

## Session history

`docs/sessions/SESSION-SUMMARY-YYYY-MM-DD.md`
