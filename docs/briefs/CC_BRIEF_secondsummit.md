# CC Brief: Build secondsummit.uk

## Who this is for
Claude Code, working with direct Cloudflare access and a GitHub repo. The human (Toby)
delegates fully: he should not need to touch cPanel, the Cloudflare dashboard, or any
config. His only jobs: provide the WordPress export XML, approve visuals, and write copy.

## What this is
Second Summit — Toby's expedition site. He walked the Coast to Coast in March 2026
(documented on a WordPress site at wisecoasttocoast.com, now being retired) and walks
the Snowdonia Way in early October 2026. The site is the permanent home: the C2C
archive, the live Snowdonia expedition page, and future walks one at a time.

Tone: professional, authoritative, speaking from experience, unshowy. No grand
multi-year programme framing. Toby writes all final copy himself — build with clearly
marked placeholder text.

**Hard deadline:** fully working, field-tested, by w/c 21 Sep 2026 (dry run week).
Expedition is w/c 5 Oct 2026.

## Stack (decided — do not relitigate)
- **Astro** static site, GitHub repo, auto-deploy to **Cloudflare Pages**
- Content as markdown files in the repo (`src/content/`)
- Domain: **secondsummit.uk** — already in Cloudflare (ndever account), zone active.
  Currently pointed at Namecheap shared hosting via A record 185.61.152.19; when the
  new site is ready to go live, remove that A record and attach the domain to the
  Pages project instead. There is also an old Pages project `secondsummit` (a static
  prototype, direct upload) — supersede or reuse the project name, CC's choice.
- Do NOT touch: the Sprocket Cloudflare account, wisecoasttocoast.com DNS/hosting
  (needed intact until content import is verified), or anything at Namecheap.

## Design
The approved design is the prototype file (attach: `second_summit_prototype.html` /
also live at secondsummit.pages.dev). Implement it faithfully as the real site:

- Palette: paper `#F7F6F1`, ink `#171F24`, slate `#28343B`, Landranger magenta
  `#C2166B` (primary accent), muted `#5C6A72`, hairline `#DAD7CC`, live green
  `#1E8F54`, gorse `#D89B21`
- Type: Bricolage Grotesque (display), Public Sans (body), IBM Plex Mono (grid refs,
  eyebrows, labels)
- Signature elements to carry over: the ridgeline SVG (two named summits — C2C ticked
  green, Snowdonia magenta — ridge fading to dotted "— we'll see"), the mono eyebrow
  labels, the live pill with pulsing dot (respect prefers-reduced-motion), the
  conditions card, the DO/DON'T rule cards
- Mobile-first throughout; audience follows live tracking on phones

## Site structure
- **Home** — hero + ridgeline, latest film embed, latest posts, short "why second
  summit" → Background
- **/snowdonia-way** — live expedition page: Garmin MapShare embed
  (https://share.garmin.com/tobywise, iframe), Today's Conditions card, daily vlog
  strip (YouTube embeds), posts filtered to the snowdonia-way category
- **/coast-to-coast** — archive: stats (172 mi · 23,180 ft · 16 days · 4 wild camps),
  day-by-day post index (the imported Daily Diary), link to "The Walk" page,
  DO/DON'T advice cards, film embed when ready
- **/wise-brothers** — retained page from old site (Toby + brother Ben; ongoing
  thread, Ben likely joins Leg 2 in April 2027)
- **/background** — Toby's story page; placeholder structure, his copy to come;
  space reserved for a piece-to-camera video embed
- Blog posts have categories; at minimum `coast-to-coast` and `snowdonia-way`.
  RSS feed on.

## Content import
Source: WordPress export XML (Toby supplies; the old site is also still live for
scraping images if the XML lacks them).
- Convert posts/pages to markdown (wordpress-export-to-markdown or equivalent)
- Download all referenced media into the repo/asset pipeline — zero images may
  remain hosted on wisecoasttocoast.com
- Preserve original post slugs/dates where possible (redirects from the old domain
  will map onto them later)
- Retain: all Daily Diary posts (→ coast-to-coast category), "The Walk" page,
  "Wise Brothers" page. Drop: JustGiving/donation content, WPCode remnants.

## Field posting (critical path — the reason this project exists)
Toby posts daily from the mountain: Android phone (Sony Xperia 1 VI), patchy signal,
low battery, evenings. Requirement: open something, type title + words, attach
photos, press Post, appears on the site within minutes. Two independent routes:

1. **PRIMARY — build a posting page**: a private form (e.g. /post, auth-protected —
   Cloudflare Access with one-time PIN to his email, or a long-secret URL + passphrase;
   CC judgement, keep login friction near zero on mobile) that commits markdown +
   images to the repo via the GitHub API from a Worker/Pages Function. Must handle:
   photo upload with client-side resize (mountain bandwidth), category select
   defaulting to snowdonia-way, graceful failure with retry (drafts survive a lost
   connection — localStorage the form state).
2. **BACKUP — Pages CMS** (pagescms.org) connected to the repo as an independent
   editing path.

Both must be tested from a phone before sign-off. Success criterion: post composed
and live in under 5 minutes on a phone, on mobile data, one-handed.

## Conditions card workflow
The Snowdonia page's "Today's Conditions" card: simplest robust mechanism wins —
recommended: the card renders from the frontmatter of the latest daily post (wind,
cloud base, rain, "the call"), so posting the morning diary entry updates it with
no second workflow. Fields optional; card hides gracefully when absent.

## Go-live sequence (only after Toby verifies the imported content in preview)
1. Pages project builds green on the pages.dev preview URL
2. Toby approves preview
3. Swap secondsummit.uk DNS from the hosting A record to the Pages project
4. Leave wisecoasttocoast.com untouched (its retirement + redirects is a later,
   separate task: 301 map old post URLs → /coast-to-coast/... before the domain
   lapses at next renewal)

## Explicitly out of scope
- Sponsorship/partner pages beyond a one-line contact mention
- Comments, newsletters, analytics beyond Cloudflare's built-in
- Any change to Sprocket infrastructure
- Second Summit multi-year roadmap content — the site looks one walk ahead only

## Definition of done
- [ ] Preview URL renders all pages, mobile-first, matching the prototype design
- [ ] All C2C posts + images imported, zero references to the old domain
- [ ] Posting flow: phone test passes (both primary and backup routes)
- [ ] Conditions card renders from latest post frontmatter
- [ ] MapShare iframe + YouTube embeds working
- [ ] Lighthouse mobile performance 90+
- [ ] secondsummit.uk serving the new site, SSL green, old prototype superseded
- [ ] One-page README in repo: how Toby posts, how to roll back, where things live
