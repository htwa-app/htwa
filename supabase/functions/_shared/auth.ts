/**
 * supabase/functions/_shared/auth.ts
 *
 * Shared helpers for Edge Functions:
 *  - getAuthedUser(req): resolve the calling user from their JWT (never trust
 *    a client-supplied userId for identity).
 *  - serviceHeaders(): headers for service-role PostgREST calls.
 *  - json(): consistent JSON responses.
 */

export type AuthedUser = { id: string; email: string | null };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Resolve the calling user from the Authorization header via GoTrue.
 * Returns null if the token is missing/invalid.
 */
export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anonKey },
  });
  if (!res.ok) return null;
  const user = await res.json() as { id?: string; email?: string };
  if (!user.id) return null;
  return { id: user.id, email: user.email ?? null };
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
