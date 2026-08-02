# secondsummit.uk

Toby Wise's expedition site: the Coast to Coast archive, the live Snowdonia Way
page, and one walk ahead at a time.

Astro static site → GitHub → auto-deploys to Cloudflare Pages. Content is
markdown in the repo; posting from the hill commits to the repo, which triggers
a rebuild.

---

## How Toby posts from the mountain

### Primary route — the site's own form

1. Open **`https://secondsummit.uk/post`** on the phone. Add it to the home
   screen once and it opens like an app.
2. First time on a new phone it asks for the **passphrase**. Save it in the
   phone's password manager. It then stays signed in for **90 days** — no email
   round-trip, nothing to receive on one bar of signal.
3. Type a title and the words. Tap **Add photos** — they are resized on the
   phone before upload, so it works on bad signal.
4. Optionally open **Conditions & extras** and fill in the morning's wind, cloud
   base, rain and "the call". This is what fills the conditions card on the
   Snowdonia Way page — no second workflow.
5. Press **Post**. It lands as one commit and the site rebuilds in a minute or
   two.

What happens when it goes wrong:

- **Signal drops mid-post** — the draft is saved on the phone continuously.
  Press Post again when signal comes back; nothing is lost.
- **Closed the tab / phone died** — reopen `/post` and the draft is restored.
- **"Signed out"** — sign in again; the draft survives.
- The **Discard draft** button is the only thing that throws work away.

### Backup route — Pages CMS

If `/post` is broken, go to **[app.pagescms.org](https://app.pagescms.org)**,
sign in with GitHub, pick this repo. The fields are the same (configured in
`.pages.yml`). It commits to the same place, so the site updates identically.

These two routes share nothing but the repo, which is the point: if one fails,
the other still works.

---

## How to roll back

Everything is a git commit, so undoing anything is a revert.

**A post that shouldn't be live** — quickest fix without a computer: open the
post in Pages CMS and tick **Draft**. It disappears on the next build.

**Undo the last change** (needs a computer):

```bash
git revert HEAD          # makes a new commit undoing the last one
git push
```

**The whole site is broken and you want yesterday back:** in the Cloudflare
dashboard → Workers & Pages → the Pages project → **Deployments**, find the last
good deployment and press **Rollback**. That is instant and does not touch the
repo — then fix the repo properly afterwards.

**Panic button:** the old WordPress site at wisecoasttocoast.com is untouched
and still live.

---

## Where things live

| What | Where |
| --- | --- |
| Posts (markdown) | `src/content/posts/*.md` |
| Long-form pages (The Walk) | `src/content/pages/*.md` |
| Imported photos from the C2C | `src/assets/c2c/` |
| Photos posted from the hill | `src/assets/field/<post-slug>/` |
| Page layouts and templates | `src/pages/`, `src/layouts/` |
| Design system (colours, type) | `src/styles/global.css` |
| Site-wide constants | `src/site.ts` |
| Content schema (frontmatter rules) | `src/content.config.ts` |
| Posting API (runs on Cloudflare) | `functions/api/` |
| Backup CMS config | `.pages.yml` |
| The one-off WordPress importer | `scripts/import-wordpress.mjs` |
| Elevation tracker component | `src/components/ElevationTracker.astro` |
| Route/overnight data for the tracker | `src/data/routes.ts` |
| Garmin MapShare proxy | `functions/api/mapshare.ts` |

**Things worth knowing in `src/site.ts`:** the film embeds are placeholders
until a YouTube ID is filled in (`FILMS`), and the contact address is set there
in one place.

---

## Photographs

Originals live **outside the repo**, in `~/Pictures/secondsummit/`:

```
~/Pictures/secondsummit/
  c2c/          Coast to Coast
  snowdonia/    Snowdonia Way
  general/      portraits, kit, anything else
```

Drop full-size Lightroom exports in, then:

```bash
npm run photos
```

That resizes to 2400px, converts to optimised JPEG, **strips GPS and all
other metadata**, writes the result into `src/assets/photos/<collection>/`,
and prints the import lines to paste. Re-running only touches what changed,
and the originals are never modified or copied into the repo.

GPS stripping matters: phone photos carry the exact pitch of a wild camp
unless it is removed.

### Banners

`src/components/Banner.astro` takes one wide master and crops it per screen —
4:3 on a phone, 16:9 from 560px, 21:9 on a laptop. `focal` decides what
survives the crop:

```astro
<Banner image={cribGoch} alt="The Crib Goch ridge" focal="center 40%"
        caption="Crib Goch — the crux of day two" priority />
```

Export landscape masters around 2400px wide and leave some headroom around
the subject, so there is room to crop. Use `priority` only on the first
banner of a page — it is usually the largest contentful paint.

Where one master cannot work for both shapes, pass `portraitImage` and that
file is used below 560px instead.

### Licensing

Only use photographs that are Toby's own or properly licensed. Images pulled
from a web search are not licensed, whatever they look like, and this site
carries his name.

## The live tracker

The elevation profile on `/coast-to-coast` — and, once it has data, on
`/snowdonia-way` — is the tracker carried over from the old site: the route
profile, a clickable dot for every overnight stop, and during a walk a marker
that moves along the profile from the Garmin inReach position.

Live position comes through `functions/api/mapshare.ts`, because Garmin sends
no CORS headers and the browser cannot fetch the feed directly. It caches for
four minutes, so the number of people watching does not change how often
Garmin is asked.

**The Snowdonia Way tracker is empty until its route data exists.** The
component renders nothing at all while `route` is empty, so the page stays
clean. To bring it up, `src/data/routes.ts` needs three things, all of which
fall out of the planning GPX:

```bash
node scripts/gpx-to-route.mjs snowdonia-way.gpx --sample 0.5 --wp 0.25
```

That prints a `route` array (the profile), a `waypoints` array (what converts
a live GPS fix into a point on the profile), and the cumulative mileage every
five miles. Paste the first two into `SNOWDONIA_WAY`, then write the `days`
array by hand — one entry per night, with the end mile, the place, the type of
stay and a website if there is one. Those are the dots.

Summit heights from a GPX are approximate; correct the ones that matter to
their OS values and add a label as a third element, `[12.4, 1085, "Yr Wyddfa"]`.

## Working on it locally

Requires Node 22 (`.nvmrc` pins it; `nvm use` picks it up).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build into dist/
npm run check      # typecheck the site and the Cloudflare functions
```

To exercise the posting flow locally (needs the Cloudflare runtime, since
`/post` talks to a Pages Function):

```bash
cp .dev.vars.example .dev.vars   # then fill it in
npm run dev:functions            # http://localhost:8788
```

`scripts/mock-github.mjs` stands in for the GitHub API so the publish path can
be tested without a token and without committing anything real:

```bash
node scripts/mock-github.mjs 8787 /tmp/mock-commit
# then run wrangler with GITHUB_API_BASE=http://localhost:8787
```

---

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which typechecks,
builds, and uploads to the Cloudflare Pages project **`secondsummit`**. Takes
about 50 seconds. Nothing needs doing by hand — that is what makes a post filed
from the hill appear on the site by itself.

Deploys are serialised, so two posts filed a minute apart cannot race; the
second waits and the newer build wins.

Progress and logs: **Actions** tab on GitHub. Deployment history and the
rollback button: Cloudflare dashboard → Workers & Pages → `secondsummit`.

**Repository secrets** (GitHub → Settings → Secrets → Actions) — these let the
workflow deploy:

| Name | What it is |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped token: Pages Edit + DNS Edit on this zone |
| `CLOUDFLARE_ACCOUNT_ID` | `3a46e840dc20018b68d56d4b46b03a23` |

### Required environment variables

Set these on the Pages project itself, not in GitHub (the first three as
**encrypted secrets**). They are what `/post` uses at runtime, and they are
already configured:

| Name | What it is |
| --- | --- |
| `POST_PASSPHRASE` | The passphrase typed at `/post` |
| `SESSION_SECRET` | Random string signing the session cookie — rotating it signs all devices out |
| `GITHUB_TOKEN` | Fine-grained PAT, **this repo only**, `Contents: read & write` |
| `GITHUB_REPO` | `r3dpill/secondsummit` |
| `GITHUB_BRANCH` | `main` |

Without these, `/post` returns "Posting is not configured on this deployment"
and the rest of the site is unaffected. Changing `SESSION_SECRET` signs every
device out; the current value is kept in `~/.secrets/secondsummit-session-secret`
on Toby's machine.

### Going live

The site is live at **https://secondsummit.pages.dev**. The real domain still
points at the old Namecheap hosting and has not been touched.

To switch it over, once the preview has been approved:

1. In Cloudflare DNS for `secondsummit.uk`, **remove the A record to
   `185.61.152.19`** (and the `www` CNAME follows it).
2. Attach `secondsummit.uk` to the `secondsummit` Pages project as a custom
   domain — Cloudflare writes the new DNS record itself.
3. **Leave the MX and SPF records alone.** Email forwarding for the domain runs
   through `registrar-servers.com` and is unrelated to hosting; removing them
   would silently break mail.
4. Leave `wisecoasttocoast.com` alone. Retiring it — 301s from the old post URLs
   onto `/posts/...` — is a separate job before the domain lapses. Every
   imported post keeps its old path in `legacyUrl` frontmatter to build that
   redirect map from.
