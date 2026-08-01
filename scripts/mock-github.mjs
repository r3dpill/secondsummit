/**
 * Minimal stand-in for the slice of the GitHub Git Data API that
 * functions/api/publish.ts uses, so the whole publish path — slug collision
 * handling, blob upload, tree assembly, commit, ref update — can be exercised
 * locally without a token and without touching a real repo.
 *
 * Writes whatever the function committed into <outDir>/ so the generated
 * markdown can be inspected and validated.
 *
 *   node scripts/mock-github.mjs [port] [outDir]
 */

import { createServer } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.argv[2] ?? 8787);
const OUT = process.argv[3] ?? '.mock-commit';

const blobs = new Map(); // sha -> { content, encoding }
let counter = 0;
const sha = (prefix) => `${prefix}${String(++counter).padStart(38, '0')}`;

/** Pretend the repo already has a post with this slug, to test collisions. */
const EXISTING = [{ name: 'day-3-glyders-wild-camp.md' }];

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data ? JSON.parse(data) : {}));
  });

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

await mkdir(OUT, { recursive: true });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');

  if (req.method === 'GET' && route.startsWith('/contents/src/content/posts')) {
    return send(res, 200, EXISTING);
  }

  if (req.method === 'POST' && route === '/git/blobs') {
    const body = await readBody(req);
    const id = sha('b');
    blobs.set(id, body);
    return send(res, 201, { sha: id });
  }

  if (req.method === 'GET' && route.startsWith('/git/ref/heads/')) {
    return send(res, 200, { object: { sha: 'parentcommit0000000000000000000000000000' } });
  }

  if (req.method === 'GET' && route.startsWith('/git/commits/')) {
    return send(res, 200, { tree: { sha: 'basetree00000000000000000000000000000000' } });
  }

  if (req.method === 'POST' && route === '/git/trees') {
    const body = await readBody(req);
    // Materialise the tree so the committed files can be inspected.
    for (const entry of body.tree) {
      const blob = blobs.get(entry.sha);
      if (!blob) continue;
      const dest = path.join(OUT, entry.path);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(
        dest,
        blob.encoding === 'base64' ? Buffer.from(blob.content, 'base64') : blob.content,
      );
      console.log(`  committed ${entry.path} (${entry.mode}, ${blob.encoding})`);
    }
    return send(res, 201, { sha: sha('t') });
  }

  if (req.method === 'POST' && route === '/git/commits') {
    const body = await readBody(req);
    console.log(`  commit message: ${body.message}`);
    console.log(`  parents: ${JSON.stringify(body.parents)}`);
    return send(res, 201, { sha: 'newcommit000000000000000000000000000000a' });
  }

  if (req.method === 'PATCH' && route.startsWith('/git/refs/heads/')) {
    const body = await readBody(req);
    console.log(`  ref ${route} -> ${body.sha}`);
    return send(res, 200, { object: { sha: body.sha } });
  }

  console.warn(`  UNHANDLED ${req.method} ${route}`);
  return send(res, 404, { message: 'Not Found (mock)' });
});

server.listen(PORT, () => console.log(`mock GitHub API on :${PORT}, writing to ${OUT}/`));
