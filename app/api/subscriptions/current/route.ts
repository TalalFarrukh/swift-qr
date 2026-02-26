import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPlanForTier } from '@/lib/plans';
import { DEFAULT_SUBSCRIPTION_TIER } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status, qr_code_limit, campaign_limit')
    .eq('id', user.id)
    .maybeSingle();

  if (userError) {
    console.error('subscriptions current: failed to fetch user row', userError);
    return NextResponse.json({ error: 'Failed to load subscription', code: 'SUBSCRIPTION_LOAD_ERROR' }, { status: 500 });
  }

  const plan = getPlanForTier(userRow?.subscription_tier ?? DEFAULT_SUBSCRIPTION_TIER, {
    qrCodeLimit: userRow?.qr_code_limit ?? null,
    campaignLimit: userRow?.campaign_limit ?? null,
  });

  // Basic usage counts for billing UI
  const [{ count: qrCount }, { count: campaignCount }] = await Promise.all([
    supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_dynamic', true),
    supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_dynamic', true)
      .not('campaign_type', 'is', null),
  ]);

  return NextResponse.json({
    tier: plan.definition.tier,
    name: plan.definition.name,
    status: userRow?.subscription_status ?? 'active',
    limits: plan.limits,
    usage: {
      qrCodes: qrCount ?? 0,
      campaigns: campaignCount ?? 0,
    },
  });
}

