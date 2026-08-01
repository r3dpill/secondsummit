/**
 * Session handling for /post.
 *
 * Auth choice (brief left this to CC's judgement, asking for near-zero login
 * friction on a phone): a passphrase exchanged for a long-lived signed cookie,
 * rather than Cloudflare Access one-time PINs. An OTP means an email round-trip
 * at the start of every session — on a mountain with one bar of signal and a
 * dying battery that is exactly the wrong dependency. The passphrase can live
 * in the phone's password manager, and the cookie means it is typed roughly
 * once a quarter.
 */

export interface Env {
  /** The passphrase Toby types. Set as a Cloudflare Pages secret. */
  POST_PASSPHRASE: string;
  /** Random string used to sign session cookies. Rotating it logs everyone out. */
  SESSION_SECRET: string;
  /** Fine-grained PAT with Contents: read & write on this repo only. */
  GITHUB_TOKEN: string;
  /** e.g. "r3dpill/secondsummit" */
  GITHUB_REPO: string;
  /** Branch to commit to. Defaults to "main". */
  GITHUB_BRANCH?: string;
  /** Test-only override of the GitHub API origin. Unset in production. */
  GITHUB_API_BASE?: string;
}

const COOKIE_NAME = 'ss_session';
/** 90 days — long enough that the walk never prompts a re-login. */
const MAX_AGE = 60 * 60 * 24 * 90;

const encoder = new TextEncoder();

const b64url = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

/**
 * Constant-time comparison. Both sides are hashed first so the comparison is
 * over fixed-width digests — differing lengths can't short-circuit the loop
 * and leak the passphrase length.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export async function verifyPassphrase(input: string, env: Env): Promise<boolean> {
  if (!env.POST_PASSPHRASE) return false;
  return timingSafeEqual(input, env.POST_PASSPHRASE);
}

export async function createSessionCookie(env: Env): Promise<string> {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = String(expires);
  const token = `${payload}.${await sign(payload, env.SESSION_SECRET)}`;
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
  ].join('; ');
}

export const clearSessionCookie = () =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function hasValidSession(request: Request, env: Env): Promise<boolean> {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const [payload, signature] = decodeURIComponent(match[1]).split('.');
  if (!payload || !signature) return false;
  if (!(await timingSafeEqual(signature, await sign(payload, env.SESSION_SECRET)))) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
