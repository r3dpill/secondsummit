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

**Things worth knowing in `src/site.ts`:** the film embeds are placeholders
until a YouTube ID is filled in (`FILMS`), and the contact address is set there
in one place.

---

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

Cloudflare Pages builds on every push to `main`.

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 22 (set `NODE_VERSION=22.23.1`)

### Required environment variables

Set these on the Pages project (the first three as **encrypted secrets**):

| Name | What it is |
| --- | --- |
| `POST_PASSPHRASE` | The passphrase typed at `/post` |
| `SESSION_SECRET` | Random string signing the session cookie — rotating it signs all devices out |
| `GITHUB_TOKEN` | Fine-grained PAT, **this repo only**, `Contents: read & write` |
| `GITHUB_REPO` | `r3dpill/secondsummit` |
| `GITHUB_BRANCH` | `main` |

Without these, `/post` returns "Posting is not configured on this deployment"
and the rest of the site is unaffected.

### Going live

The domain currently points at Namecheap shared hosting. Switching it over:

1. Confirm the `*.pages.dev` preview looks right.
2. In Cloudflare DNS for `secondsummit.uk`, **remove the A record to
   `185.61.152.19`**.
3. Attach `secondsummit.uk` to the Pages project as a custom domain.
4. Leave `wisecoasttocoast.com` alone. Retiring it — 301s from the old post URLs
   onto `/posts/...` — is a separate job before the domain lapses. Every
   imported post keeps its old path in `legacyUrl` frontmatter to build that
   redirect map from.
