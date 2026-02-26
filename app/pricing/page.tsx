import Link from 'next/link';
import { PLANS } from '@/lib/plans';

export default function PricingPage() {
  const plans = Object.values(PLANS);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
          <p className="text-sm text-muted-foreground">
            Start free, upgrade when you need more QR codes, campaigns, or analytics history.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className="flex flex-col rounded-lg border bg-card p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground capitalize">{plan.tier}</p>

              <div className="mt-4">
                {plan.monthlyPrice != null ? (
                  <p className="text-2xl font-semibold">
                    ${plan.monthlyPrice.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground"> / month</span>
                  </p>
                ) : (
                  <p className="text-2xl font-semibold">
                    {typeof plan.annualPrice === 'string' ? plan.annualPrice : 'Free'}
                  </p>
                )}
                {typeof plan.annualPrice === 'number' && (
                  <p className="text-xs text-muted-foreground">
                    or ${plan.annualPrice.toFixed(0)} / year
                  </p>
                )}
              </div>

              <ul className="mt-4 space-y-1 text-sm">
                <li>
                  <span className="font-medium">Dynamic QR codes:</span>{' '}
                  {plan.limits.dynamicQRCodes ?? 'Unlimited'}
                </li>
                <li>
                  <span className="font-medium">Campaigns:</span>{' '}
                  {plan.limits.campaigns ?? 'Unlimited'}
                </li>
                <li>
                  <span className="font-medium">Monthly scans:</span>{' '}
                  {plan.limits.scansPerMonth ?? 'Unlimited'}
                </li>
                <li>
                  <span className="font-medium">Analytics history:</span>{' '}
                  {plan.limits.analyticsHistoryDays ?? 'Unlimited'} days
                </li>
                <li>
                  <span className="font-medium">File uploads:</span>{' '}
                  {plan.limits.fileUploads ? 'Yes' : 'No'}
                </li>
              </ul>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  {plan.tier === 'free' ? 'Get started' : 'Contact to upgrade'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Billing and upgrades are currently handled manually. After you sign up, contact support to change plans.
        </div>
      </div>
    </main>
  );
}

