/**
 * Rasterises the PNG assets that can't be SVG: the Apple touch icon and the
 * default Open Graph card. Re-run after changing public/favicon.svg.
 *
 *   node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

const touchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#28343B"/>
  <path d="M3 25 L11 13 L15 18 L21 8 L29 20" fill="none" stroke="#F7F6F1" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="21" cy="8" r="3" fill="#C2166B"/>
</svg>`;

const ogCard = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1C262C"/>
  <rect width="1200" height="96" fill="#141B20"/>
  <text x="64" y="62" font-family="Helvetica,Arial,sans-serif" font-size="34" font-weight="700" fill="#E9E7DF">SECOND<tspan fill="#F28DBB">/</tspan>SUMMIT</text>
  <text x="1136" y="60" text-anchor="end" font-family="Courier,monospace" font-size="20" fill="#8FA2AB">SH 647 556 · ERYRI</text>

  <text x="64" y="250" font-family="Helvetica,Arial,sans-serif" font-size="60" font-weight="600" fill="#E9E7DF">Long walks, done properly,</text>
  <text x="64" y="322" font-family="Helvetica,Arial,sans-serif" font-size="60" font-weight="600" fill="#E9E7DF">filmed honestly.</text>

  <path d="M64 560 Q 260 540 460 548 T 860 528 T 1136 512" fill="none" stroke="#46545D" stroke-width="2"/>
  <path d="M64 578 L226 470 L332 526 L508 412 L632 468" fill="none" stroke="#CFD6D1" stroke-width="5" stroke-linejoin="round"/>
  <path d="M632 468 L774 404 L880 444 L1022 372 L1136 412" fill="none" stroke="#CFD6D1" stroke-width="4" stroke-linejoin="round" stroke-dasharray="2 14" stroke-linecap="round" opacity="0.55"/>
  <circle cx="226" cy="470" r="12" fill="#45C283"/>
  <circle cx="508" cy="412" r="12" fill="#F28DBB"/>
</svg>`;

await sharp(Buffer.from(touchIcon)).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
console.log('wrote public/apple-touch-icon.png');

await sharp(Buffer.from(ogCard)).png().toFile(path.join(PUBLIC, 'og-default.png'));
console.log('wrote public/og-default.png');
