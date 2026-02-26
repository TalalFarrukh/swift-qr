import { NextRequest, NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';

export async function GET(request: NextRequest) {
  const plans = Object.values(PLANS).map((plan) => ({
    tier: plan.tier,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice ?? null,
    annualPrice: plan.annualPrice ?? null,
    limits: plan.limits,
  }));

  return NextResponse.json({ plans });
}

