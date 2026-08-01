/**
 * Screenshot the built site at phone and desktop widths, for eyeballing design
 * fidelity against the prototype.
 *
 *   npm run build && npx astro preview &   # or any static server on :4321
 *   node scripts/shoot.mjs [outDir]
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = process.argv[2] ?? '.shots';

const ROUTES = [
  ['home', '/'],
  ['snowdonia-way', '/snowdonia-way/'],
  ['coast-to-coast', '/coast-to-coast/'],
  ['wise-brothers', '/wise-brothers/'],
  ['background', '/background/'],
  ['the-walk', '/the-walk/'],
  ['post', '/posts/day-16-finish-line/'],
  ['posts-index', '/posts/'],
  ['post-form', '/post/'],
];

const VIEWPORTS = [
  ['phone', { width: 390, height: 844 }, 3],
  ['desktop', { width: 1280, height: 900 }, 1],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [vpName, viewport, dpr] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    isMobile: vpName === 'phone',
    hasTouch: vpName === 'phone',
  });
  const page = await context.newPage();

  for (const [name, route] of ROUTES) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => null);
    if (!res || !res.ok()) {
      console.warn(`  ${vpName}/${name}: ${res ? res.status() : 'no response'} — skipped`);
      continue;
    }
    await page.screenshot({
      path: path.join(OUT, `${vpName}-${name}.png`),
      fullPage: true,
    });
    console.log(`  ${vpName}/${name}`);
  }
  await context.close();
}

await browser.close();
console.log(`\nScreenshots in ${OUT}/`);
