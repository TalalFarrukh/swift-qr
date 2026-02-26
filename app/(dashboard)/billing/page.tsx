import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getPlanForTier } from '@/lib/plans';
import { DEFAULT_SUBSCRIPTION_TIER } from '@/lib/constants';

export default async function BillingPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const { data: userRow } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status, qr_code_limit, campaign_limit')
    .eq('id', user.id)
    .maybeSingle();

  const plan = getPlanForTier(userRow?.subscription_tier ?? DEFAULT_SUBSCRIPTION_TIER, {
    qrCodeLimit: userRow?.qr_code_limit ?? null,
    campaignLimit: userRow?.campaign_limit ?? null,
  });

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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Billing</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Current plan</p>
          <p className="mt-1 text-lg font-semibold">
            {plan.definition.name}
            <span className="ml-2 text-xs uppercase text-muted-foreground">({plan.definition.tier})</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status: {userRow?.subscription_status ?? 'active'}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Usage</p>
          <div className="text-xs text-muted-foreground">
            <p>
              Dynamic QR codes: {qrCount ?? 0}{' '}
              {plan.limits.dynamicQRCodes != null ? `/ ${plan.limits.dynamicQRCodes}` : '/ ∞'}
            </p>
            <p>
              Campaigns: {campaignCount ?? 0}{' '}
              {plan.limits.campaigns != null ? `/ ${plan.limits.campaigns}` : '/ ∞'}
            </p>
            <p>
              Monthly scans:{' '}
              {plan.limits.scansPerMonth != null
                ? `up to ${plan.limits.scansPerMonth} (free tier)`
                : 'Unlimited'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Plan changes</p>
        <p>
          Automated checkout and self-serve billing are not enabled yet. To upgrade or change plans, contact support or
          update the plan manually in the database.
        </p>
      </div>
    </div>
  );
}

