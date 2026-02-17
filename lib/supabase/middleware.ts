import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from './server';

export async function getUserFromRequest(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuth(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.redirect(new URL('/login', request.url)),
    };
  }

  return { user, response: null };
}

