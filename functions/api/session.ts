import {
  type Env,
  clearSessionCookie,
  createSessionCookie,
  hasValidSession,
  json,
  verifyPassphrase,
} from '../_shared/session';

/** GET /api/session — is this phone still logged in? */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return json({ authenticated: await hasValidSession(request, env) });
};

/** POST /api/session — exchange the passphrase for a 90-day cookie. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.POST_PASSPHRASE || !env.SESSION_SECRET) {
    return json({ error: 'Posting is not configured on this deployment.' }, { status: 503 });
  }

  let passphrase = '';
  try {
    ({ passphrase = '' } = (await request.json()) as { passphrase?: string });
  } catch {
    return json({ error: 'Bad request.' }, { status: 400 });
  }

  if (!(await verifyPassphrase(passphrase, env))) {
    // Slow failures down a little; this endpoint is not worth brute-forcing
    // but the delay costs a legitimate login nothing noticeable.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return json({ error: 'That passphrase was not recognised.' }, { status: 401 });
  }

  return json({ authenticated: true }, { headers: { 'Set-Cookie': await createSessionCookie(env) } });
};

/** DELETE /api/session — log out. */
export const onRequestDelete: PagesFunction<Env> = async () =>
  json({ authenticated: false }, { headers: { 'Set-Cookie': clearSessionCookie() } });
