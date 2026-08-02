/**
 * Photo library → web-ready assets.
 *
 *   npm run photos
 *
 * Drop full-size exports into the staging library, which lives OUTSIDE the
 * repo so you are never editing files inside the project:
 *
 *   ~/Pictures/secondsummit/
 *     c2c/           Coast to Coast
 *     snowdonia/     Snowdonia Way
 *     general/       portraits, kit, anything else
 *
 * This resizes, converts and strips GPS from each one, writes the result to
 * src/assets/photos/<collection>/, and prints the import lines to paste.
 * Re-running only processes what has changed.
 *
 * Override the library location with PHOTO_LIBRARY=/some/path.
 */

import { readdir, mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY = process.env.PHOTO_LIBRARY || path.join(os.homedir(), 'Pictures', 'secondsummit');
const OUT_ROOT = path.join(ROOT, 'src/assets/photos');
const MANIFEST = path.join(ROOT, 'src/assets/photos/.manifest.json');

/** Wide enough for a 21:9 banner on a 2x laptop, without being wasteful. */
const MAX_WIDTH = 2400;
const QUALITY = 82;

const slug = (name) =>
  path
    .basename(name, path.extname(name))
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

if (!existsSync(LIBRARY)) {
  await mkdir(path.join(LIBRARY, 'c2c'), { recursive: true });
  await mkdir(path.join(LIBRARY, 'snowdonia'), { recursive: true });
  await mkdir(path.join(LIBRARY, 'general'), { recursive: true });
  console.log(`Created the photo library at ${LIBRARY}`);
  console.log('Drop exports into c2c/, snowdonia/ or general/ and run this again.');
  process.exit(0);
}

let manifest = {};
try {
  manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {
  // First run.
}

const collections = (await readdir(LIBRARY, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
  .map((d) => d.name);

if (collections.length === 0) {
  console.log(`No collections in ${LIBRARY}. Make a folder (c2c, snowdonia, general) and add photos.`);
  process.exit(0);
}

const imported = [];
let processed = 0;
let skipped = 0;

for (const collection of collections) {
  const srcDir = path.join(LIBRARY, collection);
  const outDir = path.join(OUT_ROOT, collection);
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f));

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const info = await stat(srcPath);
    const key = `${collection}/${file}`;
    const stamp = `${info.size}:${Math.round(info.mtimeMs)}`;

    const name = `${slug(file)}.jpg`;
    const outPath = path.join(outDir, name);

    if (manifest[key]?.stamp === stamp && existsSync(outPath)) {
      skipped++;
      imported.push({ collection, name, caption: manifest[key].caption ?? '' });
      continue;
    }

    const image = sharp(srcPath).rotate(); // honour EXIF orientation, then drop it
    const meta = await image.metadata();

    await image
      .resize({ width: Math.min(MAX_WIDTH, meta.width ?? MAX_WIDTH), withoutEnlargement: true })
      // No metadata is carried over, which also removes GPS — worth doing when
      // some of these are wild camp pitches.
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(outPath);

    const out = await stat(outPath);
    manifest[key] = { stamp, name, caption: manifest[key]?.caption ?? '' };
    imported.push({ collection, name, caption: '' });
    processed++;
    console.log(
      `  ${collection}/${name}  ${meta.width}×${meta.height} → ` +
        `${(info.size / 1024).toFixed(0)}KB → ${(out.size / 1024).toFixed(0)}KB`,
    );
  }
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`\n${processed} processed, ${skipped} unchanged.`);

if (imported.length) {
  console.log('\nPaste these where you want them:\n');
  for (const { collection, name } of imported) {
    const varName = slug(name).replace(/-(\w)/g, (_, c) => c.toUpperCase());
    console.log(`  import ${varName} from '../assets/photos/${collection}/${name}';`);
  }
  console.log('\nBanner usage:\n');
  const first = imported[0];
  const firstVar = slug(first.name).replace(/-(\w)/g, (_, c) => c.toUpperCase());
  console.log(`  <Banner image={${firstVar}} alt="…" focal="center 40%" caption="…" priority />`);
}

console.log(`\nLibrary: ${LIBRARY}`);
console.log('Originals stay there; only the processed copies go into the repo.');
