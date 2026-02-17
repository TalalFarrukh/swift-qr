import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { email, password, fullName } = bodySchema.parse(json);

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error || !data.user) {
      const message = error?.message ?? 'No user returned';
      return NextResponse.json(
        {
          error: 'Registration failed',
          code: 'REGISTER_FAILED',
          details: message,
        },
        { status: 400 },
      );
    }

    // Mirror into application users table (best-effort).
    try {
      const serviceClient = createServiceRoleSupabaseClient();
      const { error: mirrorError } = await serviceClient.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
      });
      if (mirrorError) {
        console.error('Register: failed to mirror user into public.users:', mirrorError.message);
      }
    } catch (err) {
      console.error('Register: exception mirroring user into public.users:', err);
    }

    return NextResponse.json({ user: { id: data.user.id, email } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

