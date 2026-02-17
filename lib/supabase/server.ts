import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, {
              path: options.path ?? '/',
              maxAge: options.maxAge,
              domain: options.domain,
              secure: options.secure,
              sameSite: options.sameSite as 'lax' | 'strict' | 'none' | undefined,
              httpOnly: options.httpOnly,
            });
          } catch {
            // Ignore in Server Components / middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', {
              path: options.path ?? '/',
              maxAge: 0,
            });
          } catch {
            // Ignore in Server Components / middleware
          }
        },
      },
    },
  );
}

export function createServiceRoleSupabaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {
          // noop
        },
        remove() {
          // noop
        },
      },
    },
  );
}

