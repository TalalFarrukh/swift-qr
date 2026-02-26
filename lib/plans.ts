export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanLimits {
  dynamicQRCodes: number | null;
  campaigns: number | null;
  scansPerMonth: number | null;
  customization: 'basic' | 'full';
  analyticsHistoryDays: number | null;
  fileUploads: boolean;
  maxFileSizeMB?: number;
  csvExport?: boolean;
  prioritySupport?: boolean;
  whiteLabel?: boolean;
  apiAccess?: boolean;
  customIntegrations?: boolean;
  dedicatedSupport?: boolean;
  sla?: boolean;
}

export interface PlanDefinition {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice?: number;
  annualPrice?: number | 'custom';
  limits: PlanLimits;
}

export const PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Free',
    limits: {
      dynamicQRCodes: 1,
      campaigns: 1,
      scansPerMonth: 2,
      customization: 'basic',
      analyticsHistoryDays: 7,
      fileUploads: false,
    },
  },
  basic: {
    tier: 'basic',
    name: 'Basic',
    monthlyPrice: 5.63,
    annualPrice: 49,
    limits: {
      dynamicQRCodes: 5,
      campaigns: 2,
      scansPerMonth: null,
      customization: 'full',
      analyticsHistoryDays: 30,
      fileUploads: true,
      maxFileSizeMB: 30,
      prioritySupport: false,
    },
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 8.57,
    annualPrice: 75,
    limits: {
      dynamicQRCodes: 100,
      campaigns: 5,
      scansPerMonth: null,
      customization: 'full',
      analyticsHistoryDays: null,
      fileUploads: true,
      maxFileSizeMB: 30,
      csvExport: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    annualPrice: 'custom',
    limits: {
      dynamicQRCodes: null,
      campaigns: null,
      scansPerMonth: null,
      customization: 'full',
      analyticsHistoryDays: null,
      fileUploads: true,
      maxFileSizeMB: 100,
      whiteLabel: true,
      apiAccess: true,
      customIntegrations: true,
      dedicatedSupport: true,
      sla: true,
    },
  },
};

export interface UserPlanOverrides {
  qrCodeLimit?: number | null;
  campaignLimit?: number | null;
}

export interface EffectivePlan {
  definition: PlanDefinition;
  limits: PlanLimits;
}

export function getSubscriptionTier(rawTier: string | null | undefined): SubscriptionTier {
  if (rawTier === 'basic' || rawTier === 'pro' || rawTier === 'enterprise') {
    return rawTier;
  }
  return 'free';
}

export function getPlanForTier(tier: string | null | undefined, overrides?: UserPlanOverrides | null): EffectivePlan {
  const normalizedTier = getSubscriptionTier(tier);
  const base = PLANS[normalizedTier];

  const limits: PlanLimits = {
    ...base.limits,
    dynamicQRCodes:
      overrides?.qrCodeLimit != null && overrides.qrCodeLimit > 0 ? overrides.qrCodeLimit : base.limits.dynamicQRCodes,
    campaigns:
      overrides?.campaignLimit != null && overrides.campaignLimit > 0 ? overrides.campaignLimit : base.limits.campaigns,
  };

  return { definition: base, limits };
}

