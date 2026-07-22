/**
 * supabase/functions/_shared/auth.ts
 *
 * Shared helpers for Edge Functions:
 *  - getAuthedUser(req): resolve the calling user from their JWT (never trust
 *    a client-supplied userId for identity).
 *  - serviceHeaders(): headers for service-role PostgREST calls.
 *  - json(): consistent JSON responses.
 */

export interface AuthedUser {
  id: string;
  email: string | null;
}

const AUTH_TIMEOUT_MS = 5000;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Resolve the calling user from the Authorization header via GoTrue.
 * Returns null if the token is missing/invalid, the auth service times out,
 * or the fetch itself throws (DNS/connection failure) — every one of the 5
 * edge functions calls this on every request, so an unguarded/un-timed-out
 * fetch here would hang or crash all of them, not just this one.
 */
export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const user = await res.json() as { id?: string; email?: string };
    if (!user.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch (err) {
    console.error('[auth] getAuthedUser fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Headers for service-role PostgREST requests (server-side reads/writes). */
export function serviceHeaders(): Record<string, string> | null {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

export function supabaseRestUrl(path: string): string {
  return `${Deno.env.get('SUPABASE_URL')}/rest/v1${path}`;
}
