import { type Env, hasValidSession, json } from '../_shared/session';

/**
 * POST /api/publish — commit a post (markdown + photos) to the repo in a
 * single commit via the GitHub Git Data API, which triggers exactly one
 * Cloudflare Pages build.
 *
 * Everything is done in one commit deliberately: committing files one at a
 * time would kick off a build per photo and could leave a post referencing
 * images that had not landed yet.
 */

const POSTS_DIR = 'src/content/posts';
const ASSETS_DIR = 'src/assets/field';
const DEFAULT_API = 'https://api.github.com';

interface Photo {
  /** base64, no data: prefix */
  data: string;
  /** file extension without the dot, e.g. "jpg" */
  ext?: string;
  alt?: string;
}

interface PublishBody {
  title?: string;
  body?: string;
  category?: string;
  day?: number | string;
  distance?: string;
  video?: string;
  conditions?: Record<string, string>;
  photos?: Photo[];
  /** ISO date; defaults to now. Lets a post written offline keep its real time. */
  pubDate?: string;
}

const CATEGORIES = new Set(['snowdonia-way', 'coast-to-coast', 'training']);

const CONDITION_KEYS = ['stage', 'summits', 'wind', 'cloudBase', 'rain', 'call'] as const;

/** URL/file-safe slug from a title. */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

const yamlStr = (value: string) => `'${value.replace(/'/g, "''")}'`;

class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function githubClient(env: Env) {
  // Secrets pasted into a dashboard pick up stray whitespace and newlines
  // surprisingly often, and fetch rejects those as invalid header values.
  const repo = env.GITHUB_REPO.trim();
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'secondsummit-field-post',
    'Content-Type': 'application/json',
  };

  // Overridable only so the commit sequence can be exercised against a local
  // mock in tests; unset in every real deployment.
  const api = (env.GITHUB_API_BASE ?? DEFAULT_API).replace(/\/+$/, '');

  return async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${api}/repos/${repo}${path}`, { ...init, headers });
    if (!res.ok) {
      const detail = await res.text();
      throw new GitHubError(
        `GitHub ${res.status} on ${path}: ${detail.slice(0, 300)}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await hasValidSession(request, env))) {
    return json({ error: 'Not signed in.', reauth: true }, { status: 401 });
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: 'Posting is not configured on this deployment.' }, { status: 503 });
  }

  let payload: PublishBody;
  try {
    payload = (await request.json()) as PublishBody;
  } catch {
    return json({ error: 'Could not read the post.' }, { status: 400 });
  }

  const title = (payload.title ?? '').trim();
  const body = (payload.body ?? '').trim();
  const category = payload.category ?? 'snowdonia-way';
  const photos = Array.isArray(payload.photos) ? payload.photos : [];

  if (!title) return json({ error: 'A title is needed.' }, { status: 400 });
  if (!body && photos.length === 0) {
    return json({ error: 'Add some words or a photo.' }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return json({ error: `Unknown category "${category}".` }, { status: 400 });
  }

  const branch = env.GITHUB_BRANCH || 'main';
  const gh = githubClient(env);
  const pubDate = payload.pubDate ? new Date(payload.pubDate) : new Date();
  const date = Number.isNaN(pubDate.getTime()) ? new Date() : pubDate;

  try {
    // ---- pick a slug that is not already taken -------------------------
    const base = slugify(title) || `post-${date.toISOString().slice(0, 10)}`;
    let existing: { name: string }[] = [];
    try {
      existing = await gh<{ name: string }[]>(
        `/contents/${POSTS_DIR}?ref=${encodeURIComponent(branch)}`,
      );
    } catch (err) {
      // An empty posts directory 404s; anything else is a real failure.
      if (!(err instanceof GitHubError) || err.status !== 404) throw err;
    }
    const taken = new Set(existing.map((f) => f.name.replace(/\.mdx?$/, '')));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

    // ---- upload photos as blobs ---------------------------------------
    const photoPaths: string[] = [];
    const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];

    for (const [i, photo] of photos.entries()) {
      if (!photo?.data) continue;
      const ext = (photo.ext ?? 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
      const path = `${ASSETS_DIR}/${slug}/${i + 1}.${ext}`;
      const blob = await gh<{ sha: string }>('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: photo.data, encoding: 'base64' }),
      });
      tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      photoPaths.push(path);
    }

    // ---- assemble the markdown ----------------------------------------
    const rel = (path: string) => `../../${path.replace(/^src\//, '')}`;
    const conditions = payload.conditions ?? {};
    const conditionLines = CONDITION_KEYS.filter((k) => (conditions[k] ?? '').trim()).map(
      (k) => `  ${k}: ${yamlStr(conditions[k].trim())}`,
    );

    const day = payload.day === '' || payload.day == null ? null : Number(payload.day);
    const description = body
      .replace(/[#>*_`]/g, '')
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);

    const frontmatter = [
      '---',
      `title: ${yamlStr(title)}`,
      description ? `description: ${yamlStr(description.slice(0, 155))}` : null,
      `pubDate: ${date.toISOString()}`,
      `category: ${category}`,
      day != null && Number.isFinite(day) ? `day: ${day}` : null,
      payload.distance?.trim() ? `distance: ${yamlStr(payload.distance.trim())}` : null,
      payload.video?.trim() ? `video: ${yamlStr(payload.video.trim())}` : null,
      photoPaths[0] ? `cover: ${yamlStr(rel(photoPaths[0]))}` : null,
      photoPaths[0] ? `coverAlt: ${yamlStr(photos[0]?.alt?.trim() || title)}` : null,
      conditionLines.length ? 'conditions:' : null,
      ...conditionLines,
      '---',
    ]
      .filter((line) => line !== null)
      .join('\n');

    // The cover is rendered by the post layout; the rest go inline below.
    const inline = photoPaths
      .slice(1)
      .map((path, i) => `![${(photos[i + 1]?.alt ?? '').replace(/[[\]]/g, '')}](${rel(path)})`)
      .join('\n\n');

    const markdown = [frontmatter, '', body, inline && `\n${inline}`].filter(Boolean).join('\n');

    const markdownBlob = await gh<{ sha: string }>('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: markdown, encoding: 'utf-8' }),
    });
    tree.push({
      path: `${POSTS_DIR}/${slug}.md`,
      mode: '100644',
      type: 'blob',
      sha: markdownBlob.sha,
    });

    // ---- one commit, one build ----------------------------------------
    const ref = await gh<{ object: { sha: string } }>(
      `/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    const parent = ref.object.sha;
    const baseCommit = await gh<{ tree: { sha: string } }>(`/git/commits/${parent}`);

    const newTree = await gh<{ sha: string }>('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
    });

    const commit = await gh<{ sha: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: `Field post: ${title}`,
        tree: newTree.sha,
        parents: [parent],
      }),
    });

    await gh(`/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha }),
    });

    return json({
      ok: true,
      slug,
      url: `/posts/${slug}/`,
      commit: commit.sha.slice(0, 7),
      photos: photoPaths.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 4xx from GitHub means the request itself was wrong (bad token, bad
    // branch) and retrying verbatim will not help; anything else is worth a
    // retry from the phone once signal comes back.
    const status = err instanceof GitHubError && err.status < 500 && err.status !== 409 ? 400 : 502;
    return json({ error: 'Could not publish.', detail: message, retryable: status === 502 }, { status });
  }
};
