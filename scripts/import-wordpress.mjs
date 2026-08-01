/**
 * One-shot importer: wisecoasttocoast.com WordPress export -> Astro content.
 *
 *   npm run import:wp
 *
 * Converts the retained posts to markdown, downloads every referenced image
 * into src/assets/, and rewrites the bodies to point at the local copies —
 * nothing may remain hosted on the old domain (brief, "Content import").
 *
 * Re-runnable: images already on disk are not re-fetched, and post files are
 * rewritten from source each time. The two custom-HTML pages ("The Walk",
 * "Wise Brothers") are NOT handled here — their markup was a bespoke dark
 * theme that had to be rebuilt by hand against the new design system.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XML_PATH = path.join(ROOT, 'files/wisecoasttocoast2026.WordPress.2026-08-01.xml');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const ASSETS_DIR = path.join(ROOT, 'src/assets/c2c');
const OLD_HOST = 'wisecoasttocoast.com';

/**
 * Posts to retain, keyed by WordPress slug. Everything else in the export is
 * dropped: JustGiving/donation pages, WPCode remnants, the superseded Live
 * Tracking / Video Diary / Sponsor / Contact pages, Sample Page and the
 * unpublished privacy draft.
 */
const RETAIN = {
  'day-1': { category: 'coast-to-coast', day: 1, distance: '14.2 mi' },
  'days-2-and-3': { category: 'coast-to-coast', day: 2, distance: '9.9 + 14.7 mi' },
  'day-15': { category: 'coast-to-coast', day: 15, distance: '12.1 mi' },
  'day-16-finish-line': { category: 'coast-to-coast', day: 16, distance: '9.5 mi' },
  'snow-on-clee-hill': { category: 'training' },
};

// ---------------------------------------------------------------- helpers

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
});

// WordPress wraps images in <figure>; keep the caption if there is one and
// drop the wrapper class soup either way.
turndown.addRule('figure', {
  filter: 'figure',
  replacement: (_content, node) => {
    const img = node.querySelector?.('img');
    if (!img) return _content;
    const src = img.getAttribute('src') ?? '';
    // The export contains one <figure><img alt=""/></figure> with no src — an
    // image that never saved. It is absent from the live post too, so drop it
    // rather than emit a broken `![]()`.
    if (!src) return '';
    const alt = (img.getAttribute('alt') ?? '').replace(/[\[\]]/g, '');
    const caption = node.querySelector?.('figcaption')?.textContent?.trim();
    const title = caption ? ` "${caption.replace(/"/g, "'")}"` : '';
    return `\n\n![${alt}](${src}${title})\n\n`;
  },
});

/** Strip WordPress's resized-variant suffix: foo-768x1024.jpg -> foo.jpg */
const stripSize = (url) => url.replace(/-\d+x\d+(\.[a-z]{3,4})$/i, '$1');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) return 'cached';
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'fetched';
}

/** YAML-safe scalar. */
const yamlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ---------------------------------------------------------------- parse

const xml = await readFile(XML_PATH, 'utf8');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  isArray: (name) => ['item', 'category'].includes(name),
});
const doc = parser.parse(xml);
const items = doc.rss.channel.item ?? [];

/** Text of a field that may or may not have arrived wrapped in CDATA. */
const val = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return String(v.__cdata ?? v['#text'] ?? '');
  return String(v);
};

/**
 * Every full-size upload the export knows about, indexed by filename, so an
 * inline reference to a resized variant can be resolved back to the original.
 */
const attachments = new Map();
for (const item of items) {
  if (val(item['wp:post_type']) !== 'attachment') continue;
  const url = val(item['wp:attachment_url']);
  if (url) attachments.set(path.basename(url), url);
}

/**
 * Resolve an inline <img src> to the best available original.
 * Handles both `foo-768x1024.jpg` -> `foo.jpg` and the `-scaled` variant
 * WordPress substitutes for uploads over 2560px.
 */
function resolveOriginal(src) {
  const url = new URL(src, `https://${OLD_HOST}`);
  const base = path.basename(url.pathname);
  const candidates = [
    stripSize(base),
    stripSize(base).replace(/(\.[a-z]{3,4})$/i, '-scaled$1'),
    base,
  ];
  for (const c of candidates) {
    if (attachments.has(c)) return attachments.get(c);
  }
  // Not in the export's attachment list — fall back to the de-sized URL and
  // let the download step tell us if it 404s.
  return `${url.origin}${url.pathname.replace(base, stripSize(base))}`;
}

// ---------------------------------------------------------------- convert

await mkdir(POSTS_DIR, { recursive: true });
await mkdir(ASSETS_DIR, { recursive: true });

const media = new Map(); // original URL -> local filename
let written = 0;

for (const item of items) {
  if (val(item['wp:post_type']) !== 'post') continue;
  if (val(item['wp:status']) !== 'publish') continue;

  const slug = val(item['wp:post_name']);
  const meta = RETAIN[slug];
  if (!meta) {
    console.log(`  skip   ${slug} (not in retain list)`);
    continue;
  }

  const title = val(item.title);
  const dateStr = val(item['wp:post_date_gmt']) || val(item['wp:post_date']);
  const pubDate = new Date(`${dateStr.replace(' ', 'T')}Z`);
  let html = val(item['content:encoded']);

  // Drop Gutenberg block comments and any WPCode / donation remnants.
  html = html
    .replace(/<!--\s*\/?wp:[^>]*?-->/g, '')
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Point every image at a local original, queuing the download.
  html = html.replace(/src="([^"]+)"/g, (match, src) => {
    if (!src.includes(OLD_HOST) && !src.startsWith('/wp-content/')) return match;
    const original = resolveOriginal(src);
    const filename = path.basename(new URL(original).pathname);
    media.set(original, filename);
    return `src="../../assets/c2c/${filename}"`;
  });

  let body = turndown.turndown(html).trim();

  // The first image, if the post opens with one, becomes the cover.
  let cover;
  let coverAlt;
  const opening = body.match(/^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)\s*/);
  if (opening) {
    coverAlt = opening[1];
    cover = opening[2];
    body = body.slice(opening[0].length).trim();
  }

  // First real paragraph, trimmed to a whole sentence (or at worst a whole
  // word) so the meta description never ends mid-syllable.
  const firstPara = (body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').match(/^[^\n#>*-].{20,}/m) ?? [''])[0]
    .replace(/[*_`\[\]]/g, '')
    .trim();
  let description = firstPara;
  if (description.length > 155) {
    const sentence = description.slice(0, 156).match(/^.*[.!?](?=\s)/s);
    description = sentence
      ? sentence[0]
      : `${description.slice(0, 152).replace(/\s+\S*$/, '')}…`;
  }

  const fm = [
    '---',
    `title: ${yamlStr(title)}`,
    description ? `description: ${yamlStr(description)}` : null,
    `pubDate: ${pubDate.toISOString()}`,
    `category: ${meta.category}`,
    meta.day != null ? `day: ${meta.day}` : null,
    meta.distance ? `distance: ${yamlStr(meta.distance)}` : null,
    cover ? `cover: ${yamlStr(cover)}` : null,
    cover ? `coverAlt: ${yamlStr(coverAlt || title)}` : null,
    `legacyUrl: ${yamlStr(new URL(val(item.link)).pathname)}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  await writeFile(path.join(POSTS_DIR, `${slug}.md`), `${fm}\n\n${body}\n`, 'utf8');
  written++;
  console.log(`  post   ${slug}.md`);
}

// ---------------------------------------------------------------- media

// The two hand-converted pages reference these directly; make sure they come
// down with everything else.
for (const extra of ['Toby_Profile.jpg', 'Ben_Profile.jpg', 'wainwright-home.jpg']) {
  const url = attachments.get(extra);
  if (url) media.set(url, extra);
  else console.warn(`  WARN   ${extra} not found in export attachments`);
}

console.log(`\nDownloading ${media.size} images to src/assets/c2c/ ...`);
let fetched = 0;
let cached = 0;
const failures = [];

for (const [url, filename] of media) {
  try {
    const result = await download(url, path.join(ASSETS_DIR, filename));
    result === 'fetched' ? fetched++ : cached++;
  } catch (err) {
    failures.push(`${filename}: ${err.message}`);
  }
}

console.log(`\n${written} posts written.`);
console.log(`Images: ${fetched} downloaded, ${cached} already present.`);
if (failures.length) {
  console.error(`\n${failures.length} image(s) FAILED — these would leave dead links:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exitCode = 1;
}
